import { db } from '../db/index.js';
import { aiUserMemory } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AIService } from './ai.service.js';

export interface UserMemoryEntry {
    category: string;
    key: string;
    value: string;
    confidence?: number;
}

/**
 * Service for managing per-user memory (preferences, notes, learned facts)
 * This allows the AI to remember things about specific Discord users
 */
export class UserMemoryService {
    /**
     * Get all memory entries for a specific user
     */
    static async getUserMemory(botId: string, discordUserId: string): Promise<any[]> {
        try {
            return await db.select().from(aiUserMemory)
                .where(and(
                    eq(aiUserMemory.botId, botId),
                    eq(aiUserMemory.discordUserId, discordUserId)
                ))
                .orderBy(desc(aiUserMemory.updatedAt));
        } catch (error) {
            console.error('[UserMemoryService] Error getting user memory:', error);
            return [];
        }
    }

    /**
     * Save or update a memory entry for a user
     */
    static async saveMemory(
        botId: string, 
        discordUserId: string, 
        discordUserName: string,
        entry: UserMemoryEntry
    ): Promise<void> {
        try {
            // Check if similar entry exists
            const existing = await db.select().from(aiUserMemory)
                .where(and(
                    eq(aiUserMemory.botId, botId),
                    eq(aiUserMemory.discordUserId, discordUserId)
                ));
            
            const duplicate = existing.find(e => 
                e.key?.toLowerCase() === entry.key.toLowerCase() &&
                e.category === entry.category
            );

            if (duplicate) {
                // Update existing entry
                await db.update(aiUserMemory)
                    .set({
                        value: entry.value,
                        confidence: entry.confidence || 80,
                        discordUserName: discordUserName,
                        updatedAt: new Date()
                    })
                    .where(eq(aiUserMemory.id, duplicate.id));
                console.log(`[UserMemoryService] Updated memory for ${discordUserName}: ${entry.key}`);
            } else {
                // Insert new entry
                await db.insert(aiUserMemory).values({
                    id: randomUUID(),
                    botId,
                    discordUserId,
                    discordUserName,
                    category: entry.category,
                    key: entry.key,
                    value: entry.value,
                    confidence: entry.confidence || 80,
                    source: 'auto',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`[UserMemoryService] Saved new memory for ${discordUserName}: ${entry.key}`);
            }
        } catch (error) {
            console.error('[UserMemoryService] Error saving memory:', error);
        }
    }

    /**
     * Get user memory formatted for system prompt
     */
    static async getUserMemoryContext(botId: string, discordUserId: string, userName: string): Promise<string> {
        try {
            const entries = await this.getUserMemory(botId, discordUserId);
            if (entries.length === 0) return '';

            // Group by category
            const grouped: Record<string, string[]> = {};
            for (const entry of entries) {
                const cat = entry.category || 'note';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(`${entry.key}: ${entry.value}`);
            }

            // Format for prompt
            let context = `\n\n=== WHAT YOU KNOW ABOUT ${userName.toUpperCase()} ===\n`;
            for (const [category, items] of Object.entries(grouped)) {
                context += `[${category.toUpperCase()}]\n`;
                context += items.join('\n') + '\n';
            }
            context += '\nUse this knowledge to personalize your responses to this user.';

            return context;
        } catch (error) {
            console.error('[UserMemoryService] Error getting user memory context:', error);
            return '';
        }
    }

    /**
     * Extract user preferences/info from a conversation using AI
     * This is called even when Training Mode is OFF (passive learning)
     */
    static async extractUserInfo(
        userMessage: string,
        aiResponse: string,
        discordUserId: string,
        discordUserName: string,
        botConfig: any
    ): Promise<UserMemoryEntry[]> {
        try {
            // Get first available AI provider
            const providers = botConfig?.ai?.providers || [];
            if (providers.length === 0) return [];

            const provider = providers[0];
            const extractionPrompt = `Analyze this conversation and extract information ABOUT THE USER that should be remembered.

User "${discordUserName}" said: "${userMessage.substring(0, 400)}"
AI responded: "${aiResponse.substring(0, 300)}"

Extract ONLY clear preferences, interests, or facts about this USER:
- Language preference (e.g., prefers Malay, English)
- Response style preference (e.g., likes detailed answers, prefers short replies)
- Interests/hobbies mentioned
- Skills or profession mentioned
- Personal facts (name, location if shared)

Return JSON array. Categories: preference, style, interest, fact
Only extract if there's clear NEW information about the user.
Return empty array [] if nothing new to remember about the user.

Format: [{"category": "preference|style|interest|fact", "key": "topic", "value": "info", "confidence": 70}]

JSON only:`;

            const result = await AIService.chat({
                provider: provider.provider || provider.id,
                apiKey: provider.apiKey,
                model: provider.modelChat || '',
                mode: 'chat',
                azureEndpoint: provider.azureEndpoint,
                azureDeployment: provider.azureDeployment,
                endpoint: provider.endpoint || provider.zanaiEndpoint || ''
            }, [
                { role: 'system', content: 'You are a user preference extraction assistant. Extract and return only valid JSON about the USER, not general facts.' },
                { role: 'user', content: extractionPrompt }
            ]);

            if (result.error || !result.content) return [];

            // Parse JSON
            const content = result.content.trim();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return [];

            const entries: UserMemoryEntry[] = JSON.parse(jsonMatch[0]);
            
            // Validate entries
            return entries.filter(e => 
                e.category && e.key && e.value &&
                typeof e.key === 'string' && typeof e.value === 'string' &&
                e.key.length > 0 && e.value.length > 0
            );

        } catch (error) {
            console.error('[UserMemoryService] Error extracting user info:', error);
            return [];
        }
    }

    /**
     * Delete all memory for a specific user
     */
    static async deleteUserMemory(botId: string, discordUserId: string): Promise<void> {
        try {
            await db.delete(aiUserMemory)
                .where(and(
                    eq(aiUserMemory.botId, botId),
                    eq(aiUserMemory.discordUserId, discordUserId)
                ));
            console.log(`[UserMemoryService] Deleted all memory for user ${discordUserId}`);
        } catch (error) {
            console.error('[UserMemoryService] Error deleting user memory:', error);
            throw error;
        }
    }

    /**
     * Delete all user memory for a bot (used when deleting all training data)
     */
    static async deleteAllBotUserMemory(botId: string): Promise<void> {
        try {
            await db.delete(aiUserMemory)
                .where(eq(aiUserMemory.botId, botId));
            console.log(`[UserMemoryService] Deleted all user memory for bot ${botId}`);
        } catch (error) {
            console.error('[UserMemoryService] Error deleting all user memory:', error);
            throw error;
        }
    }
}
