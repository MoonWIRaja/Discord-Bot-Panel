import { db } from "../db/index.js";
import { bots, botCollaborators, user } from "../db/schema.js";
import { eq, and, or, like } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

// In a real app, use a proper encryption library (e.g. crypto)
// For now we will store tokens as plain text or simple base64 to demonstrate structure
// TODO: Implement proper AES encryption

export class BotService {
  static async validateToken(token: string): Promise<{ id: string; username: string; discriminator: string; avatar: string | null } | null> {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    return new Promise((resolve) => {
      client.once('ready', () => {
        const user = client.user;
        if (user) {
          resolve({
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar
          });
        } else {
          resolve(null);
        }
        client.destroy();
      });

      client.login(token).catch(() => {
        resolve(null);
      });
    });
  }

  static async updateBotDiscordProfile(token: string, newName: string) {
    // Note: Changing bot username has strict rate limits (2/hour).
    // We use REST API directly to avoid full login overhead just for this if possible,
    // but updating current user requires a logged in client usually or specific endpoint.
    // Let's use the REST API.
    try {
      const rest = new REST({ version: '10' }).setToken(token);
      await rest.patch(Routes.user('@me'), {
        body: { username: newName }
      });
      return true;
    } catch (error) {
      console.error("Failed to update Discord bot name:", error);
      throw new Error("Failed to update bot name on Discord. You typically can only change it twice per hour.");
    }
  }

  // Check if token already exists in database
  static async isTokenDuplicate(token: string): Promise<boolean> {
    const encryptedToken = Buffer.from(token).toString('base64');
    const existing = await db.select().from(bots).where(eq(bots.token, encryptedToken));
    return existing.length > 0;
  }

  static async createBot(userId: string, token: string) {
    // 1. Check for duplicate token first
    if (await this.isTokenDuplicate(token)) {
      throw new Error("This bot is already registered in the system");
    }

    // 2. Verify token with Discord API
    const discordBot = await this.validateToken(token);
    if (!discordBot) {
      throw new Error("Invalid Discord Bot Token");
    }

    // 3. Encrypt token (mock)
    const encryptedToken = Buffer.from(token).toString('base64');

    // 4. Save to DB
    const id = uuidv4();
    const newBot = {
      id,
      userId,
      token: encryptedToken,
      clientId: discordBot.id, // Discord Bot ID
      name: discordBot.username, // Use real name
      avatar: discordBot.avatar,
      status: 'offline' as const,
      config: null
    };

    await db.insert(bots).values(newBot);

    // 5. Add owner as collaborator
    await db.insert(botCollaborators).values({
      id: uuidv4(),
      botId: id,
      userId: userId,
      role: 'owner'
    });

    return { ...newBot, avatar: discordBot.avatar };
  }

  // Get all bots user owns OR is collaborator on
  static async getUserBots(userId: string) {
    // Get bots where user is owner
    const ownedBots = await db.select().from(bots).where(eq(bots.userId, userId));

    // Get bots where user is collaborator (but not owner - we'll dedupe anyway)
    try {
      const collaborations = await db.select({
        bot: bots
      })
        .from(botCollaborators)
        .innerJoin(bots, eq(botCollaborators.botId, bots.id))
        .where(eq(botCollaborators.userId, userId));

      // Combine and deduplicate
      const allBots = [...ownedBots];
      for (const collab of collaborations) {
        if (!allBots.find(b => b.id === collab.bot.id)) {
          allBots.push(collab.bot);
        }
      }

      return allBots;
    } catch (e) {
      // If bot_collaborators table doesn't exist yet, just return owned bots
      console.warn("bot_collaborators table may not exist yet, returning only owned bots");
      return ownedBots;
    }
  }

  static async getBot(id: string, userId: string) {
    // Check if user owns the bot OR is a collaborator
    const bot = await db.select().from(bots).where(eq(bots.id, id));
    if (!bot[0]) return null;

    // Check access
    const isOwner = bot[0].userId === userId;
    const isCollaborator = await db.select()
      .from(botCollaborators)
      .where(and(eq(botCollaborators.botId, id), eq(botCollaborators.userId, userId)));

    if (!isOwner && isCollaborator.length === 0) {
      return null; // No access
    }

    return bot[0];
  }

  static async deleteBot(id: string, userId: string) {
    // Only owner can delete
    await db.delete(bots).where(and(eq(bots.id, id), eq(bots.userId, userId)));
  }

  // Update bot status in database
  static async updateBotStatus(botId: string, status: 'online' | 'offline' | 'error') {
    console.log(`[BotService] Updating bot ${botId} status to: ${status}`);
    const result = await db.update(bots)
      .set({ status, updatedAt: new Date() })
      .where(eq(bots.id, botId));
    console.log(`[BotService] Status update result:`, result);
  }

  // Collaborator methods
  static async getCollaborators(botId: string) {
    return await db.select({
      id: botCollaborators.id,
      role: botCollaborators.role,
      createdAt: botCollaborators.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      }
    })
      .from(botCollaborators)
      .innerJoin(user, eq(botCollaborators.userId, user.id))
      .where(eq(botCollaborators.botId, botId));
  }

  static async addCollaborator(botId: string, userId: string, role: 'editor' | 'viewer' = 'editor') {
    // Check if already a collaborator
    const existing = await db.select()
      .from(botCollaborators)
      .where(and(eq(botCollaborators.botId, botId), eq(botCollaborators.userId, userId)));

    if (existing.length > 0) {
      throw new Error("User is already a collaborator");
    }

    await db.insert(botCollaborators).values({
      id: uuidv4(),
      botId,
      userId,
      role
    });
  }

  static async removeCollaborator(botId: string, collaboratorId: string) {
    // Don't allow removing owner
    const collab = await db.select()
      .from(botCollaborators)
      .where(eq(botCollaborators.id, collaboratorId));

    if (collab[0]?.role === 'owner') {
      throw new Error("Cannot remove bot owner");
    }

    await db.delete(botCollaborators).where(eq(botCollaborators.id, collaboratorId));
  }

  // Search users by Discord name or email
  static async searchUsers(query: string) {
    return await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image
    })
      .from(user)
      .where(or(
        like(user.name, `%${query}%`),
        like(user.email, `%${query}%`)
      ))
      .limit(10);
  }

  // Helper to re-validate an existing bot (e.g. on startup or periodically)
  static async checkBotStatus(token: string): Promise<'online' | 'offline' | 'error'> {
    const isValid = await this.validateToken(token);
    return isValid ? 'online' : 'error';
  }
}
