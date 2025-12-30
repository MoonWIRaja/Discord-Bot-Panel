import { db } from '../db/index.js';
import { aiKnowledgeBase } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AIService } from './ai.service.js';

export interface KnowledgeEntry {
    category: string;
    key: string;
    value: string;
    confidence?: number;
}

export class KnowledgeService {
    /**
     * Extract knowledge from a conversation using AI
     * Returns structured facts/information
     */
    static async extractKnowledge(
        userMessage: string,
        aiResponse: string,
        botConfig: any
    ): Promise<KnowledgeEntry[]> {
        try {
            // Get first available AI provider from config
            const providers = botConfig?.ai?.providers || [];
            if (providers.length === 0) {
                console.log('[KnowledgeService] No AI providers configured, skipping extraction');
                return [];
            }

            const provider = providers[0];
            const extractionPrompt = `Analyze this conversation and extract important facts/information that should be remembered permanently.

User: "${userMessage.substring(0, 500)}"
AI: "${aiResponse.substring(0, 500)}"

Extract facts in JSON format. Categories: company, person, product, fact, preference
Only extract if there's notable NEW information (names, facts, preferences, etc).
Return empty array [] if nothing important to remember.

Format: [{"category": "company|person|product|fact|preference", "key": "topic/name", "value": "info", "confidence": 80}]

JSON only, no explanation:`;

            const result = await AIService.chat({
                provider: provider.id,
                apiKey: provider.apiKey,
                model: provider.models?.[0] || '',
                mode: 'chat',
                azureEndpoint: provider.azureEndpoint,
                azureDeployment: provider.azureDeployment
            }, [
                { role: 'system', content: 'You are a knowledge extraction assistant. Extract and return only valid JSON.' },
                { role: 'user', content: extractionPrompt }
            ]);

            if (result.error || !result.content) {
                return [];
            }

            // Parse JSON from response
            const content = result.content.trim();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }

            const entries: KnowledgeEntry[] = JSON.parse(jsonMatch[0]);
            
            // Validate entries
            return entries.filter(e => 
                e.category && e.key && e.value &&
                typeof e.key === 'string' && typeof e.value === 'string' &&
                e.key.length > 0 && e.value.length > 0
            );

        } catch (error) {
            console.error('[KnowledgeService] Error extracting knowledge:', error);
            return [];
        }
    }

    /**
     * Save knowledge entries to database
     */
    static async saveKnowledge(botId: string, entries: KnowledgeEntry[]): Promise<void> {
        try {
            for (const entry of entries) {
                // Check if similar entry exists (same key)
                const existing = await db.select().from(aiKnowledgeBase)
                    .where(eq(aiKnowledgeBase.botId, botId));
                
                const duplicate = existing.find(e => 
                    e.key?.toLowerCase() === entry.key.toLowerCase() &&
                    e.category === entry.category
                );

                if (duplicate) {
                    // Update existing entry with new value
                    await db.update(aiKnowledgeBase)
                        .set({
                            value: entry.value,
                            confidence: entry.confidence || 80,
                            updatedAt: new Date()
                        })
                        .where(eq(aiKnowledgeBase.id, duplicate.id));
                    console.log(`[KnowledgeService] Updated knowledge: ${entry.key}`);
                } else {
                    // Insert new entry
                    await db.insert(aiKnowledgeBase).values({
                        id: randomUUID(),
                        botId,
                        category: entry.category,
                        key: entry.key,
                        value: entry.value,
                        confidence: entry.confidence || 80,
                        source: 'auto',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    console.log(`[KnowledgeService] Saved new knowledge: ${entry.key}`);
                }
            }
        } catch (error) {
            console.error('[KnowledgeService] Error saving knowledge:', error);
        }
    }

    /**
     * Get all knowledge entries for a bot
     */
    static async getKnowledge(botId: string): Promise<any[]> {
        try {
            return await db.select().from(aiKnowledgeBase)
                .where(eq(aiKnowledgeBase.botId, botId))
                .orderBy(desc(aiKnowledgeBase.updatedAt));
        } catch (error) {
            console.error('[KnowledgeService] Error getting knowledge:', error);
            return [];
        }
    }

    /**
     * Get knowledge formatted for system prompt
     */
    static async getKnowledgeContext(botId: string): Promise<string> {
        try {
            const entries = await this.getKnowledge(botId);
            if (entries.length === 0) {
                return '';
            }

            // Group by category
            const grouped: Record<string, string[]> = {};
            for (const entry of entries) {
                const cat = entry.category || 'fact';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(`${entry.key}: ${entry.value}`);
            }

            // Format for prompt
            let context = '\n\n=== BOT KNOWLEDGE BASE ===\n';
            for (const [category, items] of Object.entries(grouped)) {
                context += `\n[${category.toUpperCase()}]\n`;
                context += items.join('\n');
            }
            context += '\n\nUse this knowledge when relevant in conversations.';

            return context;
        } catch (error) {
            console.error('[KnowledgeService] Error getting knowledge context:', error);
            return '';
        }
    }

    /**
     * Delete all knowledge for a bot (called when Delete Training)
     */
    static async deleteAllKnowledge(botId: string): Promise<void> {
        try {
            await db.delete(aiKnowledgeBase)
                .where(eq(aiKnowledgeBase.botId, botId));
            console.log(`[KnowledgeService] Deleted all knowledge for bot ${botId}`);
        } catch (error) {
            console.error('[KnowledgeService] Error deleting knowledge:', error);
            throw error;
        }
    }

    /**
     * Delete a specific knowledge entry
     */
    static async deleteEntry(botId: string, entryId: string): Promise<void> {
        try {
            await db.delete(aiKnowledgeBase)
                .where(eq(aiKnowledgeBase.id, entryId));
        } catch (error) {
            console.error('[KnowledgeService] Error deleting entry:', error);
            throw error;
        }
    }

    /**
     * Add manual knowledge entry
     */
    static async addManualEntry(
        botId: string,
        category: string,
        key: string,
        value: string
    ): Promise<void> {
        try {
            await db.insert(aiKnowledgeBase).values({
                id: randomUUID(),
                botId,
                category,
                key,
                value,
                confidence: 100, // Manual entries are 100% confident
                source: 'manual',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('[KnowledgeService] Error adding manual entry:', error);
            throw error;
        }
    }

    /**
     * Get knowledge count for a bot
     */
    static async getKnowledgeCount(botId: string): Promise<number> {
        try {
            const entries = await db.select().from(aiKnowledgeBase)
                .where(eq(aiKnowledgeBase.botId, botId));
            return entries.length;
        } catch (error) {
            return 0;
        }
    }
}
