import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite database file path (in root of monorepo)
const dbPath = path.resolve(__dirname, '../../../../data.db');

// Create libSQL client with local SQLite file
const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { schema });
export { client };

// Run migrations for new columns (SQLite ALTER TABLE)
export async function runMigrations() {
  try {
    // Create system_settings table if not exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `).catch((e) => {
      console.log('[DB] system_settings table may already exist');
    });

    // Check and add contact_support column to plans table
    await client.execute(`
      ALTER TABLE plans ADD COLUMN contact_support INTEGER DEFAULT 0
    `).catch(() => {
      // Column likely already exists, ignore error
    });

    // Create ai_configs table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ai_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1,
        models TEXT,
        endpoint TEXT,
        deployment TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `).catch(() => { });

    // Create ai_channels table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ai_channels (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        default_provider TEXT,
        default_mode TEXT DEFAULT 'auto',
        is_active INTEGER DEFAULT 1,
        created_at INTEGER
      )
    `).catch(() => { });

    // Add ai_mode column to ai_sessions if not exists
    await client.execute(`
      ALTER TABLE ai_sessions ADD COLUMN ai_mode TEXT DEFAULT 'auto'
    `).catch(() => { });

    // Add ai_model column to ai_sessions if not exists
    await client.execute(`
      ALTER TABLE ai_sessions ADD COLUMN ai_model TEXT
    `).catch(() => { });

    console.log('[DB] Migrations completed');
  } catch (error) {
    // Ignore migration errors (tables/columns may already exist)
    console.log('[DB] Migration note:', error);
  }
}
