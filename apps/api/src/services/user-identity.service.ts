import { db } from '../db/index.js';
import { aiUserIdentity } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Service for managing user identity (Discord ID, name, preferred nickname)
 * This allows the AI to recognize users and call them by their preferred name
 */
export class UserIdentityService {
    /**
     * Get user's preferred name - returns nickname if set, otherwise Discord name
     */
    static async getPreferredName(botId: string, discordUserId: string): Promise<string | null> {
        try {
            const user = await this.getUserIdentity(botId, discordUserId);
            if (!user) return null;
            return user.preferredNickname || user.discordUserName || null;
        } catch (error) {
            console.error('[UserIdentityService] Error getting preferred name:', error);
            return null;
        }
    }

    /**
     * Check if user exists in identity database
     */
    static async isKnownUser(botId: string, discordUserId: string): Promise<boolean> {
        try {
            const user = await this.getUserIdentity(botId, discordUserId);
            return user !== null;
        } catch (error) {
            console.error('[UserIdentityService] Error checking known user:', error);
            return false;
        }
    }

    /**
     * Check if user has been introduced (completed the introduction flow)
     */
    static async hasBeenIntroduced(botId: string, discordUserId: string): Promise<boolean> {
        try {
            const user = await this.getUserIdentity(botId, discordUserId);
            return user?.hasBeenIntroduced === true;
        } catch (error) {
            console.error('[UserIdentityService] Error checking introduction status:', error);
            return false;
        }
    }

    /**
     * Register new user (called when we first see them)
     */
    static async registerUser(
        botId: string, 
        discordUserId: string, 
        discordUserName: string
    ): Promise<void> {
        try {
            // Check if already exists
            const existing = await this.getUserIdentity(botId, discordUserId);
            if (existing) {
                // Update username if changed
                if (existing.discordUserName !== discordUserName) {
                    await db.update(aiUserIdentity)
                        .set({
                            discordUserName,
                            updatedAt: new Date()
                        })
                        .where(eq(aiUserIdentity.id, existing.id));
                    console.log(`[UserIdentityService] Updated username for ${discordUserId}: ${discordUserName}`);
                }
                return;
            }

            // Insert new user
            await db.insert(aiUserIdentity).values({
                id: randomUUID(),
                botId,
                discordUserId,
                discordUserName,
                preferredNickname: null,
                hasBeenIntroduced: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`[UserIdentityService] Registered new user: ${discordUserName} (${discordUserId})`);
        } catch (error) {
            console.error('[UserIdentityService] Error registering user:', error);
        }
    }

    /**
     * Set user's preferred nickname
     */
    static async setNickname(
        botId: string, 
        discordUserId: string, 
        nickname: string
    ): Promise<void> {
        try {
            const user = await this.getUserIdentity(botId, discordUserId);
            if (!user) {
                console.error('[UserIdentityService] Cannot set nickname - user not found:', discordUserId);
                return;
            }

            await db.update(aiUserIdentity)
                .set({
                    preferredNickname: nickname,
                    hasBeenIntroduced: true, // Mark as introduced when nickname is set
                    updatedAt: new Date()
                })
                .where(eq(aiUserIdentity.id, user.id));
            
            console.log(`[UserIdentityService] Set nickname for ${discordUserId}: ${nickname}`);
        } catch (error) {
            console.error('[UserIdentityService] Error setting nickname:', error);
        }
    }

    /**
     * Mark user as introduced (they've completed the introduction flow)
     */
    static async markIntroduced(botId: string, discordUserId: string): Promise<void> {
        try {
            const user = await this.getUserIdentity(botId, discordUserId);
            if (!user) return;

            await db.update(aiUserIdentity)
                .set({
                    hasBeenIntroduced: true,
                    updatedAt: new Date()
                })
                .where(eq(aiUserIdentity.id, user.id));
            
            console.log(`[UserIdentityService] Marked user as introduced: ${discordUserId}`);
        } catch (error) {
            console.error('[UserIdentityService] Error marking user as introduced:', error);
        }
    }

    /**
     * Get full user identity record
     */
    static async getUserIdentity(botId: string, discordUserId: string): Promise<any | null> {
        try {
            const result = await db.select().from(aiUserIdentity)
                .where(and(
                    eq(aiUserIdentity.botId, botId),
                    eq(aiUserIdentity.discordUserId, discordUserId)
                ))
                .limit(1);
            
            return result[0] || null;
        } catch (error) {
            console.error('[UserIdentityService] Error getting user identity:', error);
            return null;
        }
    }

    /**
     * Get identity context for AI system prompt
     */
    static async getIdentityContext(
        botId: string, 
        discordUserId: string, 
        fallbackName: string
    ): Promise<{ name: string; isNew: boolean; needsIntroduction: boolean }> {
        try {
            const user = await this.getUserIdentity(botId, discordUserId);
            
            if (!user) {
                // New user - not in DB yet
                return {
                    name: fallbackName,
                    isNew: true,
                    needsIntroduction: true
                };
            }

            const preferredName = user.preferredNickname || user.discordUserName || fallbackName;
            
            return {
                name: preferredName,
                isNew: false,
                needsIntroduction: !user.hasBeenIntroduced
            };
        } catch (error) {
            console.error('[UserIdentityService] Error getting identity context:', error);
            return {
                name: fallbackName,
                isNew: true,
                needsIntroduction: true
            };
        }
    }

    /**
     * Delete all identity records for a bot
     */
    static async deleteAllBotIdentities(botId: string): Promise<void> {
        try {
            await db.delete(aiUserIdentity).where(eq(aiUserIdentity.botId, botId));
            console.log(`[UserIdentityService] Deleted all identities for bot ${botId}`);
        } catch (error) {
            console.error('[UserIdentityService] Error deleting bot identities:', error);
        }
    }
}
