import { db } from '../db/index.js';
import { aiTokenUsage, aiTokenLimits, bots } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface TokenCheckResult {
    allowed: boolean;
    message?: string;
    limitType?: 'daily' | 'weekly' | 'monthly';
    currentUsage?: number;
    limit?: number;
}

export interface UsageSummary {
    providerId: string;
    providerLabel: string;
    dailyUsed: number;
    weeklyUsed: number;
    monthlyUsed: number;
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    dailyCostUsd: number;
    weeklyCostUsd: number;
    monthlyCostUsd: number;
    totalRequests: number;
    isEnabled: boolean;
}

export interface UsageLog {
    id: string;
    providerId: string;
    providerLabel: string;
    userId: string | null;
    userName: string | null;
    tokensUsed: number | null;
    requestType: string | null;
    model: string | null;
    createdAt: Date;
    costUsd?: number;
    imageCount?: number;
}

// Provider pricing per 1M tokens (USD) - 2024 estimated average (input+output combined)
// Based on actual provider pricing from official sources
export const PROVIDER_PRICING: Record<string, number> = {
    'openai': 10.00,      // GPT-4o average ($5 input + $15 output / 2)
    'gemini': 1.25,       // Gemini 1.5 Flash average
    'claude': 12.00,      // Claude 3.5 Sonnet ($3 input + $15 output)
    'azure': 10.00,       // Azure OpenAI (same as OpenAI)
    'groq': 0.27,         // Groq Llama 3 - very cheap
    'mistral': 2.50,      // Mistral Large average
    'cohere': 1.00,       // Cohere Command average
    'perplexity': 1.00,   // Perplexity average
    'deepseek': 0.14,     // DeepSeek - very cheap ($0.14/1M)
    'xai': 5.00,          // xAI Grok
    'together': 0.80,     // Together AI Llama average
    'fireworks': 0.90,    // Fireworks average
    'replicate': 0.50,    // Replicate average
    'ai21': 2.50,         // AI21 Labs Jamba
    'huggingface': 0.50,  // HuggingFace average
    'ollama': 0.00,       // Ollama is FREE (local)
    'default': 5.00       // Default fallback
};

// Image generation pricing per image (USD)
export const IMAGE_PRICING: Record<string, Record<string, number>> = {
    'openai': {
        'dall-e-3': 0.040,       // Standard 1024x1024
        'dall-e-3-hd': 0.080,    // HD 1024x1024
        'dall-e-2': 0.020,       // 1024x1024
        'default': 0.040
    },
    'azure': {
        'dall-e-3': 0.040,
        'dall-e-3-hd': 0.080,
        'DALL-E-3': 0.040,
        'default': 0.040
    },
    'gemini': {
        'imagen-3': 0.020,
        'imagen-3.0-generate-002': 0.020,
        'default': 0.020
    },
    'together': {
        'FLUX.1-schnell': 0.003,
        'FLUX.1-schnell-Free': 0.000,
        'black-forest-labs/FLUX.1-schnell-Free': 0.000,
        'default': 0.003
    },
    'replicate': {
        'flux-schnell': 0.003,
        'black-forest-labs/flux-schnell': 0.003,
        'default': 0.003
    },
    'default': {
        'default': 0.020
    }
};

// Calculate cost for a given provider/model/operation
// Calculate cost for a given provider/model/operation
export function calculateCost(
    provider: string, 
    model: string, 
    operationType: 'chat' | 'image' | 'audio', 
    tokensOrCount: number
): number {
    const getProviderPricing = (p: string, map: Record<string, any>) => {
        const lower = p.toLowerCase();
        // Try exact match
        if (map[lower]) return map[lower];
        // Try splitting by hyphen (e.g. azure-123 -> azure)
        const base = lower.split('-')[0];
        if (map[base]) return map[base];
        return map['default'];
    };

    if (operationType === 'image') {
        const providerPricing = getProviderPricing(provider, IMAGE_PRICING);
        const modelPrice = providerPricing[model] || providerPricing['default'] || 0.020;
        return modelPrice * tokensOrCount; // tokensOrCount = number of images
    } else {
        // Chat - tokens
        const pricePerMillion = getProviderPricing(provider, PROVIDER_PRICING);
        return (tokensOrCount / 1_000_000) * pricePerMillion;
    }
}


export class TokenUsageService {
    /**
     * Check if usage is within limits and update counters if allowed
     */
    static async checkLimit(
        botId: string,
        providerId: string,
        providerLabel: string,
        userId?: string,
        isAdmin: boolean = false
    ): Promise<TokenCheckResult> {
        try {
            // Get or create limits record for this provider
            let limits = await db.select().from(aiTokenLimits)
                .where(and(
                    eq(aiTokenLimits.botId, botId),
                    eq(aiTokenLimits.providerId, providerId)
                ));

            // If no limits configured, create default (unlimited)
            if (limits.length === 0) {
                const newLimit = {
                    id: randomUUID(),
                    botId,
                    providerId,
                    providerLabel,
                    dailyLimit: 0,
                    weeklyLimit: 0,
                    monthlyLimit: 0,
                    autoResetDaily: true,
                    autoResetWeekly: true,
                    autoResetMonthly: true,
                    dailyUsed: 0,
                    weeklyUsed: 0,
                    monthlyUsed: 0,
                    dailyResetAt: new Date(),
                    weeklyResetAt: new Date(),
                    monthlyResetAt: new Date(),
                    allowAdminBypass: true,
                    notifyOwnerOnLimit: true,
                    isEnabled: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await db.insert(aiTokenLimits).values(newLimit);
                return { allowed: true }; // New provider, no limits yet
            }

            const limit = limits[0];

            // Check if limits are enabled
            if (!limit.isEnabled) {
                return { allowed: true };
            }

            // Admin bypass check
            if (isAdmin && limit.allowAdminBypass) {
                return { allowed: true };
            }

            // Check and reset if needed
            await this.checkAndResetLimits(botId, providerId);

            // Refresh limits after potential reset
            limits = await db.select().from(aiTokenLimits)
                .where(and(
                    eq(aiTokenLimits.botId, botId),
                    eq(aiTokenLimits.providerId, providerId)
                ));
            
            const currentLimit = limits[0];

            // Check daily limit
            if (currentLimit.dailyLimit && currentLimit.dailyLimit > 0) {
                if ((currentLimit.dailyUsed || 0) >= currentLimit.dailyLimit) {
                    return {
                        allowed: false,
                        message: `⚠️ Daily token limit reached! Used: ${currentLimit.dailyUsed}/${currentLimit.dailyLimit} tokens. Limit will reset at midnight.`,
                        limitType: 'daily',
                        currentUsage: currentLimit.dailyUsed || 0,
                        limit: currentLimit.dailyLimit
                    };
                }
            }

            // Check weekly limit
            if (currentLimit.weeklyLimit && currentLimit.weeklyLimit > 0) {
                if ((currentLimit.weeklyUsed || 0) >= currentLimit.weeklyLimit) {
                    return {
                        allowed: false,
                        message: `⚠️ Weekly token limit reached! Used: ${currentLimit.weeklyUsed}/${currentLimit.weeklyLimit} tokens. Limit will reset on Monday.`,
                        limitType: 'weekly',
                        currentUsage: currentLimit.weeklyUsed || 0,
                        limit: currentLimit.weeklyLimit
                    };
                }
            }

            // Check monthly limit
            if (currentLimit.monthlyLimit && currentLimit.monthlyLimit > 0) {
                if ((currentLimit.monthlyUsed || 0) >= currentLimit.monthlyLimit) {
                    return {
                        allowed: false,
                        message: `⚠️ Monthly token limit reached! Used: ${currentLimit.monthlyUsed}/${currentLimit.monthlyLimit} tokens. Limit will reset on the 1st.`,
                        limitType: 'monthly',
                        currentUsage: currentLimit.monthlyUsed || 0,
                        limit: currentLimit.monthlyLimit
                    };
                }
            }

            return { allowed: true };
        } catch (error) {
            console.error('[TokenUsageService] Error checking limit:', error);
            return { allowed: true }; // Allow on error to not block users
        }
    }

    /**
     * Record token usage after successful AI response
     */
    static async recordUsage(
        botId: string,
        providerId: string,
        providerLabel: string,
        tokensUsed: number | null, // null = "token not provided"
        requestType: string,
        model: string,
        userId?: string,
        userName?: string
    ): Promise<void> {
        try {
            // Calculate cost if tokens are provided
            let costUsd = 0;
            if (tokensUsed !== null && tokensUsed > 0) {
                costUsd = calculateCost(providerId, model, 'chat', tokensUsed);
            }

            // Insert usage log (kept forever for audit trail)
            await db.insert(aiTokenUsage).values({
                id: randomUUID(),
                botId,
                providerId,
                providerLabel,
                userId: userId || null,
                userName: userName || null,
                tokensUsed,
                requestType,
                model,
                costUsd,
                createdAt: new Date()
            });

            // Update usage counters in limits table
            if (tokensUsed !== null && tokensUsed > 0) {
                await db.update(aiTokenLimits)
                    .set({
                        dailyUsed: sql`COALESCE(daily_used, 0) + ${tokensUsed}`,
                        weeklyUsed: sql`COALESCE(weekly_used, 0) + ${tokensUsed}`,
                        monthlyUsed: sql`COALESCE(monthly_used, 0) + ${tokensUsed}`,
                        updatedAt: new Date()
                    })
                    .where(and(
                        eq(aiTokenLimits.botId, botId),
                        eq(aiTokenLimits.providerId, providerId)
                    ));
            }

            console.log(`[TokenUsageService] Recorded usage: ${tokensUsed !== null ? tokensUsed + ' tokens' : 'tokens not provided'} for ${providerId}`);
        } catch (error) {
            console.error('[TokenUsageService] Error recording usage:', error);
        }
    }

    /**
     * Record image generation usage with cost
     */
    static async recordImageUsage(
        botId: string,
        providerId: string,
        providerLabel: string,
        model: string,
        imageCount: number = 1,
        userId?: string,
        userName?: string
    ): Promise<void> {
        try {
            // Calculate cost
            const costUsd = calculateCost(providerId, model, 'image', imageCount);
            
            // Insert usage log
            await db.insert(aiTokenUsage).values({
                id: randomUUID(),
                botId,
                providerId,
                providerLabel,
                userId: userId || null,
                userName: userName || null,
                tokensUsed: null, // Images don't use tokens
                requestType: 'image',
                model,
                costUsd,
                imageCount,
                createdAt: new Date()
            });

            console.log(`[TokenUsageService] Recorded image: ${imageCount} image(s) for ${providerId}, cost: $${costUsd.toFixed(4)}`);
        } catch (error) {
            console.error('[TokenUsageService] Error recording image usage:', error);
        }
    }

    /**
     * Check and reset limits based on time elapsed
     */
    static async checkAndResetLimits(botId: string, providerId: string): Promise<void> {
        try {
            const limits = await db.select().from(aiTokenLimits)
                .where(and(
                    eq(aiTokenLimits.botId, botId),
                    eq(aiTokenLimits.providerId, providerId)
                ));

            if (limits.length === 0) return;

            const limit = limits[0];
            const now = new Date();
            const updates: any = {};

            // Daily reset check (reset at midnight)
            if (limit.autoResetDaily && limit.dailyResetAt) {
                const lastReset = new Date(limit.dailyResetAt);
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (lastReset < todayStart) {
                    updates.dailyUsed = 0;
                    updates.dailyResetAt = now;
                    console.log(`[TokenUsageService] Daily limit reset for ${providerId}`);
                }
            }

            // Weekly reset check (reset on Monday)
            if (limit.autoResetWeekly && limit.weeklyResetAt) {
                const lastReset = new Date(limit.weeklyResetAt);
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
                weekStart.setHours(0, 0, 0, 0);
                if (lastReset < weekStart) {
                    updates.weeklyUsed = 0;
                    updates.weeklyResetAt = now;
                    console.log(`[TokenUsageService] Weekly limit reset for ${providerId}`);
                }
            }

            // Monthly reset check (reset on 1st)
            if (limit.autoResetMonthly && limit.monthlyResetAt) {
                const lastReset = new Date(limit.monthlyResetAt);
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                if (lastReset < monthStart) {
                    updates.monthlyUsed = 0;
                    updates.monthlyResetAt = now;
                    console.log(`[TokenUsageService] Monthly limit reset for ${providerId}`);
                }
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
                updates.updatedAt = now;
                await db.update(aiTokenLimits)
                    .set(updates)
                    .where(and(
                        eq(aiTokenLimits.botId, botId),
                        eq(aiTokenLimits.providerId, providerId)
                    ));
            }
        } catch (error) {
            console.error('[TokenUsageService] Error checking/resetting limits:', error);
        }
    }

    /**
     * Get usage summary for all providers of a bot
     * Also initializes providers from aiConfigs if not yet tracked
     */
    static async getUsageSummary(botId: string): Promise<UsageSummary[]> {
        try {
            // First, fetch bot config to find configured providers
            try {
                const botData = await db.select({
                    config: bots.config
                })
                    .from(bots)
                    .where(eq(bots.id, botId));

                if (botData.length > 0 && botData[0].config) {
                    const config = botData[0].config as any;
                    // Check if config.ai.providers exists
                    if (config.ai && Array.isArray(config.ai.providers)) {
                        for (const provider of config.ai.providers) {
                            if (provider.id) {
                                await this.initializeProvider(botId, provider.id, provider.id);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[TokenUsageService] Error reading bot config:', e);
            }

            // Also check ai_token_usage table for providers that have been used
            try {
                const usedProviders = await db.select({
                    providerId: aiTokenUsage.providerId,
                    providerLabel: aiTokenUsage.providerLabel
                })
                    .from(aiTokenUsage)
                    .where(eq(aiTokenUsage.botId, botId))
                    .groupBy(aiTokenUsage.providerId);
                
                for (const provider of usedProviders) {
                    await this.initializeProvider(botId, provider.providerId, provider.providerLabel);
                }
            } catch (e) {
                // Continue silently
            }

            const limits = await db.select().from(aiTokenLimits)
                .where(eq(aiTokenLimits.botId, botId));

            // Check and reset limits for each provider (auto-reset daily/weekly/monthly)
            for (const limit of limits) {
                await this.checkAndResetLimits(botId, limit.providerId);
            }

            // Re-fetch limits after potential resets
            const updatedLimits = await db.select().from(aiTokenLimits)
                .where(eq(aiTokenLimits.botId, botId));

            // Get request counts
            const usageCounts = await db.select({
                providerId: aiTokenUsage.providerId,
                count: sql<number>`COUNT(*)`
            })
                .from(aiTokenUsage)
                .where(eq(aiTokenUsage.botId, botId))
                .groupBy(aiTokenUsage.providerId);

            const countMap = new Map(usageCounts.map(u => [u.providerId, u.count]));

            // Helper function to calculate cost from tokens
            const calculateCost = (tokens: number, providerId: string): number => {
                const pricePerMillion = PROVIDER_PRICING[providerId.toLowerCase()] || PROVIDER_PRICING['default'];
                return (tokens / 1_000_000) * pricePerMillion;
            };

            return updatedLimits.map(limit => ({
                providerId: limit.providerId,
                providerLabel: limit.providerLabel,
                dailyUsed: limit.dailyUsed || 0,
                weeklyUsed: limit.weeklyUsed || 0,
                monthlyUsed: limit.monthlyUsed || 0,
                dailyLimit: limit.dailyLimit || 0,
                weeklyLimit: limit.weeklyLimit || 0,
                monthlyLimit: limit.monthlyLimit || 0,
                dailyCostUsd: calculateCost(limit.dailyUsed || 0, limit.providerId),
                weeklyCostUsd: calculateCost(limit.weeklyUsed || 0, limit.providerId),
                monthlyCostUsd: calculateCost(limit.monthlyUsed || 0, limit.providerId),
                totalRequests: countMap.get(limit.providerId) || 0,
                isEnabled: limit.isEnabled || false
            }));
        } catch (error) {
            console.error('[TokenUsageService] Error getting usage summary:', error);
            return [];
        }
    }

    /**
     * Get recent usage logs for a bot
     */
    static async getUsageLogs(botId: string, limit: number = 100): Promise<UsageLog[]> {
        try {
            const logs = await db.select().from(aiTokenUsage)
                .where(eq(aiTokenUsage.botId, botId))
                .orderBy(desc(aiTokenUsage.createdAt))
                .limit(limit);

            // Helper function to calculate cost from tokens (for chat only)
            const calculateTokenCost = (tokens: number | null, providerId: string): number => {
                if (tokens === null) return 0;
                const pricePerMillion = PROVIDER_PRICING[providerId.toLowerCase()] || PROVIDER_PRICING['default'];
                return (tokens / 1_000_000) * pricePerMillion;
            };

            return logs.map(log => ({
                id: log.id,
                providerId: log.providerId,
                providerLabel: log.providerLabel,
                userId: log.userId,
                userName: log.userName,
                tokensUsed: log.tokensUsed,
                requestType: log.requestType,
                model: log.model,
                createdAt: log.createdAt || new Date(),
                // For images, use stored costUsd; for chat, calculate from tokens
                costUsd: log.requestType === 'image' 
                    ? (log.costUsd || 0) 
                    : calculateTokenCost(log.tokensUsed, log.providerId),
                imageCount: log.imageCount || 0
            }));
        } catch (error) {
            console.error('[TokenUsageService] Error getting usage logs:', error);
            return [];
        }
    }

    /**
     * Get token limits for a bot
     */
    static async getLimits(botId: string): Promise<any[]> {
        try {
            return await db.select().from(aiTokenLimits)
                .where(eq(aiTokenLimits.botId, botId));
        } catch (error) {
            console.error('[TokenUsageService] Error getting limits:', error);
            return [];
        }
    }

    /**
     * Update token limits for a provider
     */
    static async updateLimits(
        botId: string,
        providerId: string,
        updates: {
            dailyLimit?: number;
            weeklyLimit?: number;
            monthlyLimit?: number;
            autoResetDaily?: boolean;
            autoResetWeekly?: boolean;
            autoResetMonthly?: boolean;
            allowAdminBypass?: boolean;
            notifyOwnerOnLimit?: boolean;
            isEnabled?: boolean;
        }
    ): Promise<void> {
        try {
            await db.update(aiTokenLimits)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(aiTokenLimits.botId, botId),
                    eq(aiTokenLimits.providerId, providerId)
                ));
        } catch (error) {
            console.error('[TokenUsageService] Error updating limits:', error);
            throw error;
        }
    }

    /**
     * Manual reset of usage counters
     */
    static async manualReset(
        botId: string,
        providerId: string,
        period: 'daily' | 'weekly' | 'monthly' | 'all'
    ): Promise<void> {
        try {
            const updates: any = { updatedAt: new Date() };
            const now = new Date();

            if (period === 'daily' || period === 'all') {
                updates.dailyUsed = 0;
                updates.dailyResetAt = now;
            }
            if (period === 'weekly' || period === 'all') {
                updates.weeklyUsed = 0;
                updates.weeklyResetAt = now;
            }
            if (period === 'monthly' || period === 'all') {
                updates.monthlyUsed = 0;
                updates.monthlyResetAt = now;
            }

            await db.update(aiTokenLimits)
                .set(updates)
                .where(and(
                    eq(aiTokenLimits.botId, botId),
                    eq(aiTokenLimits.providerId, providerId)
                ));

            console.log(`[TokenUsageService] Manual reset (${period}) for ${providerId}`);
        } catch (error) {
            console.error('[TokenUsageService] Error manual reset:', error);
            throw error;
        }
    }

    /**
     * Initialize limits for a new provider (called when provider node is created in Studio)
     */
    static async initializeProvider(
        botId: string,
        providerId: string,
        providerLabel: string
    ): Promise<void> {
        try {
            const existing = await db.select().from(aiTokenLimits)
                .where(and(
                    eq(aiTokenLimits.botId, botId),
                    eq(aiTokenLimits.providerId, providerId)
                ));

            if (existing.length === 0) {
                await db.insert(aiTokenLimits).values({
                    id: randomUUID(),
                    botId,
                    providerId,
                    providerLabel,
                    dailyLimit: 0,
                    weeklyLimit: 0,
                    monthlyLimit: 0,
                    autoResetDaily: true,
                    autoResetWeekly: true,
                    autoResetMonthly: true,
                    dailyUsed: 0,
                    weeklyUsed: 0,
                    monthlyUsed: 0,
                    dailyResetAt: new Date(),
                    weeklyResetAt: new Date(),
                    monthlyResetAt: new Date(),
                    allowAdminBypass: true,
                    notifyOwnerOnLimit: true,
                    isEnabled: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`[TokenUsageService] Initialized limits for provider: ${providerLabel}`);
            } else {
                // Update label if changed
                await db.update(aiTokenLimits)
                    .set({ providerLabel, updatedAt: new Date() })
                    .where(and(
                        eq(aiTokenLimits.botId, botId),
                        eq(aiTokenLimits.providerId, providerId)
                    ));
            }
        } catch (error) {
            console.error('[TokenUsageService] Error initializing provider:', error);
        }
    }

    /**
     * Get bot owner ID for notifications
     */
    static async getBotOwnerId(botId: string): Promise<string | null> {
        try {
            const bot = await db.select({ userId: bots.userId }).from(bots)
                .where(eq(bots.id, botId));
            return bot[0]?.userId || null;
        } catch (error) {
            return null;
        }
    }
}
