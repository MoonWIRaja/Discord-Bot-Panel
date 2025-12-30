// Migration script to create ai_sessions table
import { db } from './dist/db/index.js';

// Drop existing table and recreate with correct schema
const dropTableSQL = `DROP TABLE IF EXISTS ai_sessions`;

const createTableSQL = `
CREATE TABLE ai_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ai_provider TEXT DEFAULT 'openai',
    conversation_history TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    closed_at INTEGER
)
`;

try {
    await db.run(dropTableSQL);
    await db.run(createTableSQL);
    console.log('✅ ai_sessions table recreated successfully with correct schema!');
    process.exit(0);
} catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
}
