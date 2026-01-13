import { db } from '../db/index.js';
import { aiConversationSummaries } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { AIService } from './ai.service.js';

/**
 * Service for managing conversation summaries
 * Summarizes long conversations to preserve context while reducing token usage
 */
export class ConversationService {
    /**
     * Get the latest conversation summary for a channel/thread
     */
    static async getLatestSummary(botId: string, channelId: string, threadId?: string): Promise<string | null> {
        try {
            const conditions = [
                eq(aiConversationSummaries.botId, botId),
                eq(aiConversationSummaries.channelId, channelId)
            ];
            
            if (threadId) {
                conditions.push(eq(aiConversationSummaries.threadId, threadId));
            }

            const summaries = await db.select().from(aiConversationSummaries)
                .where(and(...conditions))
                .orderBy(desc(aiConversationSummaries.updatedAt))
                .limit(1);

            return summaries[0]?.summary || null;
        } catch (error) {
            console.error('[ConversationService] Error getting summary:', error);
            return null;
        }
    }

    /**
     * Generate and save a conversation summary
     */
    static async summarizeConversation(
        botId: string,
        channelId: string,
        threadId: string | undefined,
        messages: Array<{ author: string; content: string }>,
        botConfig: any
    ): Promise<string | null> {
        try {
            if (messages.length < 10) {
                // Not enough messages to summarize
                return null;
            }

            // Get first available AI provider
            const providers = botConfig?.ai?.providers || [];
            if (providers.length === 0) return null;

            const provider = providers[0];

            // Format messages for summarization
            const conversation = messages
                .slice(-50) // Last 50 messages
                .map(m => `${m.author}: ${m.content.substring(0, 200)}`)
                .join('\n');

            const summarizePrompt = `Summarize this Discord conversation concisely. Focus on:
1. Main topics discussed
2. Key decisions or conclusions reached
3. Important information shared
4. Any action items or follow-ups mentioned

Conversation:
${conversation}

Summary (be concise, max 200 words):`;

            const result = await AIService.chat({
                provider: provider.provider || provider.id,
                apiKey: provider.apiKey,
                model: provider.modelChat || '',
                mode: 'chat',
                azureEndpoint: provider.azureEndpoint,
                azureDeployment: provider.azureDeployment,
                endpoint: provider.endpoint || provider.zanaiEndpoint || ''
            }, [
                { role: 'system', content: 'You are a conversation summarizer. Create concise, helpful summaries.' },
                { role: 'user', content: summarizePrompt }
            ]);

            if (result.error || !result.content) return null;

            const summary = result.content.trim();

            // Extract key topics
            const topicsPrompt = `List 3-5 key topics from this summary as a JSON array of strings:
"${summary}"

Format: ["topic1", "topic2", "topic3"]`;

            const topicsResult = await AIService.chat({
                provider: provider.provider || provider.id,
                apiKey: provider.apiKey,
                model: provider.modelChat || '',
                mode: 'chat',
                endpoint: provider.endpoint || provider.zanaiEndpoint || ''
            }, [
                { role: 'user', content: topicsPrompt }
            ]);

            let keyTopics = '[]';
            if (topicsResult.content) {
                const match = topicsResult.content.match(/\[[\s\S]*\]/);
                if (match) keyTopics = match[0];
            }

            // Extract unique participants
            const participants = [...new Set(messages.map(m => m.author))];

            // Save to database
            await this.saveSummary(botId, channelId, threadId, summary, keyTopics, participants, messages.length);

            console.log(`[ConversationService] Saved summary for channel ${channelId}: ${summary.substring(0, 50)}...`);
            return summary;

        } catch (error) {
            console.error('[ConversationService] Error summarizing conversation:', error);
            return null;
        }
    }

    /**
     * Save a conversation summary to database
     */
    static async saveSummary(
        botId: string,
        channelId: string,
        threadId: string | undefined,
        summary: string,
        keyTopics: string,
        participants: string[],
        messageCount: number
    ): Promise<void> {
        try {
            // Check for existing summary for this channel
            const conditions = [
                eq(aiConversationSummaries.botId, botId),
                eq(aiConversationSummaries.channelId, channelId)
            ];
            if (threadId) {
                conditions.push(eq(aiConversationSummaries.threadId, threadId));
            }

            const existing = await db.select().from(aiConversationSummaries)
                .where(and(...conditions))
                .limit(1);

            if (existing[0]) {
                // Update existing summary
                await db.update(aiConversationSummaries)
                    .set({
                        summary,
                        keyTopics,
                        participants: JSON.stringify(participants),
                        messageCount,
                        updatedAt: new Date()
                    })
                    .where(eq(aiConversationSummaries.id, existing[0].id));
            } else {
                // Create new summary
                await db.insert(aiConversationSummaries).values({
                    id: randomUUID(),
                    botId,
                    channelId,
                    threadId: threadId || null,
                    summary,
                    keyTopics,
                    participants: JSON.stringify(participants),
                    messageCount,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        } catch (error) {
            console.error('[ConversationService] Error saving summary:', error);
        }
    }

    /**
     * Get conversation context for system prompt
     * Includes latest summary if available
     */
    static async getConversationContext(botId: string, channelId: string, threadId?: string): Promise<string> {
        try {
            const summary = await this.getLatestSummary(botId, channelId, threadId);
            if (!summary) return '';

            return `\n\n=== PREVIOUS CONVERSATION SUMMARY ===
${summary}

Use this context to maintain conversation continuity.`;
        } catch (error) {
            console.error('[ConversationService] Error getting conversation context:', error);
            return '';
        }
    }

    /**
     * Delete all summaries for a bot
     */
    static async deleteAllSummaries(botId: string): Promise<void> {
        try {
            await db.delete(aiConversationSummaries)
                .where(eq(aiConversationSummaries.botId, botId));
            console.log(`[ConversationService] Deleted all summaries for bot ${botId}`);
        } catch (error) {
            console.error('[ConversationService] Error deleting summaries:', error);
        }
    }

    /**
     * Check if conversation should be summarized
     * Called periodically during long conversations
     */
    static shouldSummarize(messageCount: number, lastSummaryAt: Date | null): boolean {
        // Summarize every 30 messages, or if last summary is older than 1 hour
        if (messageCount >= 30) return true;
        
        if (lastSummaryAt) {
            const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (lastSummaryAt < hourAgo && messageCount >= 15) return true;
        }

        return false;
    }
}
