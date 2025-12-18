import { db } from "../db/index.js";
import { bots } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

// In a real app, use a proper encryption library (e.g. crypto)
// For now we will store tokens as plain text or simple base64 to demonstrate structure
// TODO: Implement proper AES encryption

export class BotService {
  static async createBot(userId: string, token: string, name: string) {
    // 1. Verify token with Discord API (mock for now or implement fetch)
    const isValid = await this.verifyDiscordToken(token);
    if (!isValid) {
      throw new Error("Invalid Discord Bot Token");
    }

    // 2. Encrypt token (mock)
    const encryptedToken = Buffer.from(token).toString('base64');

    // 3. Save to DB
    const id = uuidv4();
    await db.insert(bots).values({
      id,
      userId,
      token: encryptedToken,
      name,
      status: 'offline',
      config: {}
    });

    return { id, name, status: 'offline' };
  }

  static async getUserBots(userId: string) {
    return await db.select().from(bots).where(eq(bots.userId, userId));
  }

  static async getBot(id: string, userId: string) {
    const results = await db.select().from(bots).where(and(eq(bots.id, id), eq(bots.userId, userId)));
    return results[0] || null;
  }

  static async deleteBot(id: string, userId: string) {
    await db.delete(bots).where(and(eq(bots.id, id), eq(bots.userId, userId)));
  }

  private static async verifyDiscordToken(token: string): Promise<boolean> {
    // Simple check: see if we can fetch "Me" from Discord API
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${token}`
        }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}
