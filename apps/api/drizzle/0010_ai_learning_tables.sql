-- AI Learning Enhancement - New Tables Migration
-- Run this SQL manually on your PostgreSQL database

-- 1. User-specific memory table (per Discord user per bot)
CREATE TABLE IF NOT EXISTS ai_user_memory (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL,
    discord_user_name TEXT,
    category TEXT DEFAULT 'preference',
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence INTEGER DEFAULT 80,
    source TEXT DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Conversation summaries table
CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    thread_id TEXT,
    summary TEXT NOT NULL,
    key_topics TEXT,
    participants TEXT,
    message_count INTEGER DEFAULT 0,
    start_message_id TEXT,
    end_message_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add feedback columns to existing training data table
ALTER TABLE ai_training_data 
ADD COLUMN IF NOT EXISTS user_feedback TEXT;

ALTER TABLE ai_training_data 
ADD COLUMN IF NOT EXISTS feedback_user_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_user_memory_bot_user ON ai_user_memory(bot_id, discord_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_summaries_bot_channel ON ai_conversation_summaries(bot_id, channel_id);
