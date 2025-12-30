import { db } from '../db/index.js';
import { aiTrainingData, aiTrainingSettings, aiKnowledgeBase } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface TrainingStatus {
    isTrainingActive: boolean;
    totalExamples: number;
    lastTrainedAt: Date | null;
}

export class TrainingService {
    /**
     * Get training status for a bot
     */
    static async getStatus(botId: string): Promise<TrainingStatus> {
        try {
            const settings = await db.select().from(aiTrainingSettings)
                .where(eq(aiTrainingSettings.botId, botId));
            
            if (settings.length === 0) {
                return {
                    isTrainingActive: false,
                    totalExamples: 0,
                    lastTrainedAt: null
                };
            }
            
            return {
                isTrainingActive: settings[0].isTrainingActive || false,
                totalExamples: settings[0].totalExamples || 0,
                lastTrainedAt: settings[0].lastTrainedAt || null
            };
        } catch (error) {
            console.error('[TrainingService] Error getting status:', error);
            return {
                isTrainingActive: false,
                totalExamples: 0,
                lastTrainedAt: null
            };
        }
    }

    /**
     * Start training mode for a bot
     */
    static async startTraining(botId: string): Promise<void> {
        try {
            const existing = await db.select().from(aiTrainingSettings)
                .where(eq(aiTrainingSettings.botId, botId));
            
            if (existing.length === 0) {
                // Create new settings
                await db.insert(aiTrainingSettings).values({
                    id: randomUUID(),
                    botId,
                    isTrainingActive: true,
                    totalExamples: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            } else {
                // Update existing
                await db.update(aiTrainingSettings)
                    .set({
                        isTrainingActive: true,
                        updatedAt: new Date()
                    })
                    .where(eq(aiTrainingSettings.botId, botId));
            }
            
            console.log(`[TrainingService] Training started for bot ${botId}`);
        } catch (error) {
            console.error('[TrainingService] Error starting training:', error);
            throw error;
        }
    }

    /**
     * Stop training mode for a bot
     */
    static async stopTraining(botId: string): Promise<void> {
        try {
            await db.update(aiTrainingSettings)
                .set({
                    isTrainingActive: false,
                    lastTrainedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(aiTrainingSettings.botId, botId));
            
            console.log(`[TrainingService] Training stopped for bot ${botId}`);
        } catch (error) {
            console.error('[TrainingService] Error stopping training:', error);
            throw error;
        }
    }

    /**
     * Save a training example (user message + AI response)
     */
    static async saveExample(
        botId: string,
        userMessage: string,
        aiResponse: string,
        meta: { userId?: string; userName?: string; channelId?: string }
    ): Promise<void> {
        try {
            // Save the example
            await db.insert(aiTrainingData).values({
                id: randomUUID(),
                botId,
                userMessage,
                aiResponse,
                userId: meta.userId || null,
                userName: meta.userName || null,
                channelId: meta.channelId || null,
                isApproved: true,
                createdAt: new Date()
            });

            // Update example count
            const settings = await db.select().from(aiTrainingSettings)
                .where(eq(aiTrainingSettings.botId, botId));
            
            if (settings.length > 0) {
                await db.update(aiTrainingSettings)
                    .set({
                        totalExamples: (settings[0].totalExamples || 0) + 1,
                        updatedAt: new Date()
                    })
                    .where(eq(aiTrainingSettings.botId, botId));
            }
        } catch (error) {
            console.error('[TrainingService] Error saving example:', error);
        }
    }

    /**
     * Get training context for AI system prompt
     * Returns formatted examples for the AI to learn from
     */
    static async getTrainingContext(botId: string, limit: number = 20): Promise<string> {
        try {
            const examples = await db.select().from(aiTrainingData)
                .where(eq(aiTrainingData.botId, botId))
                .orderBy(desc(aiTrainingData.createdAt))
                .limit(limit);
            
            if (examples.length === 0) {
                return '';
            }

            // Format examples for context
            const formattedExamples = examples.map(ex => 
                `User: ${ex.userMessage.substring(0, 200)}\nYou: ${ex.aiResponse.substring(0, 300)}`
            ).join('\n\n');

            return `Here are examples of how you should respond (learn this style):\n\n${formattedExamples}`;
        } catch (error) {
            console.error('[TrainingService] Error getting training context:', error);
            return '';
        }
    }

    /**
     * Delete all training data for a bot
     */
    static async deleteAllTraining(botId: string): Promise<void> {
        try {
            // Delete all training examples
            await db.delete(aiTrainingData)
                .where(eq(aiTrainingData.botId, botId));
            
            // Delete all knowledge base entries
            await db.delete(aiKnowledgeBase)
                .where(eq(aiKnowledgeBase.botId, botId));
            
            // Reset settings
            await db.update(aiTrainingSettings)
                .set({
                    isTrainingActive: false,
                    totalExamples: 0,
                    lastTrainedAt: null,
                    updatedAt: new Date()
                })
                .where(eq(aiTrainingSettings.botId, botId));
            
            console.log(`[TrainingService] All training data + knowledge base deleted for bot ${botId}`);
        } catch (error) {
            console.error('[TrainingService] Error deleting training:', error);
            throw error;
        }
    }

    /**
     * Get training examples (for viewing/managing)
     */
    static async getExamples(botId: string, limit: number = 50): Promise<any[]> {
        try {
            return await db.select().from(aiTrainingData)
                .where(eq(aiTrainingData.botId, botId))
                .orderBy(desc(aiTrainingData.createdAt))
                .limit(limit);
        } catch (error) {
            console.error('[TrainingService] Error getting examples:', error);
            return [];
        }
    }

    /**
     * Save notification message IDs for cleanup when training stops
     */
    static async saveNotificationMsgIds(botId: string, msgIds: Record<string, string>): Promise<void> {
        try {
            await db.update(aiTrainingSettings)
                .set({
                    notificationMsgIds: JSON.stringify(msgIds),
                    updatedAt: new Date()
                })
                .where(eq(aiTrainingSettings.botId, botId));
        } catch (error) {
            console.error('[TrainingService] Error saving notification msg IDs:', error);
        }
    }

    /**
     * Get notification message IDs for cleanup
     */
    static async getNotificationMsgIds(botId: string): Promise<Record<string, string>> {
        try {
            const settings = await db.select().from(aiTrainingSettings)
                .where(eq(aiTrainingSettings.botId, botId));
            
            if (settings.length === 0 || !settings[0].notificationMsgIds) {
                return {};
            }
            
            return JSON.parse(settings[0].notificationMsgIds);
        } catch (error) {
            console.error('[TrainingService] Error getting notification msg IDs:', error);
            return {};
        }
    }

    /**
     * Clear notification message IDs after cleanup
     */
    static async clearNotificationMsgIds(botId: string): Promise<void> {
        try {
            await db.update(aiTrainingSettings)
                .set({
                    notificationMsgIds: null,
                    updatedAt: new Date()
                })
                .where(eq(aiTrainingSettings.botId, botId));
        } catch (error) {
            console.error('[TrainingService] Error clearing notification msg IDs:', error);
        }
    }
}
