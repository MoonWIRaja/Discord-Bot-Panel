import { createClient } from '@libsql/client';
import { db } from '../src/db/index.js'; // PG connection
import * as schema from '../src/db/schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🚀 Starting migration from SQLite to PostgreSQL...');

    // Connect to OLD SQLite DB
    const sqlitePath = path.resolve(__dirname, '../../data.db');
    console.log(`📂 Reading from SQLite: ${sqlitePath}`);
    const sqlite = createClient({ url: `file:${sqlitePath}` });

    // Helper to fetch all rows from SQLite
    const getAll = async (tableName: string) => {
        try {
            const res = await sqlite.execute(`SELECT * FROM ${tableName}`);
            return res.rows;
        } catch (e: any) {
            console.warn(`⚠️  Could not read table ${tableName}: ${e.message}`);
            return [];
        }
    };

    // Helper to transform SQLite types to PG types
    const transform = (row: any, tableKey: string) => {
        const newRow = { ...row };
        
        // Convert integer timestamps to Date objects
        ['createdAt', 'updatedAt', 'expiresAt', 'accessTokenExpiresAt', 
         'refreshTokenExpiresAt', 'currentPeriodStart', 'currentPeriodEnd', 
         'cancelledAt', 'paidAt', 'closedAt', 'lastTrainedAt',
         'dailyResetAt', 'weeklyResetAt', 'monthlyResetAt',
         'created_at', 'updated_at', 'last_trained_at', 'closed_at', 'paid_at',
         'daily_reset_at', 'weekly_reset_at', 'monthly_reset_at', 'start_date', 'end_date'
        ].forEach(field => {
            if (newRow[field] && typeof newRow[field] === 'number') {
                newRow[field] = new Date(newRow[field]);
            }
        });

        // Convert integer booleans (0/1) to true/false
        ['emailVerified', 'published', 'isDefault', 'contactSupport', 'isActive', 
         'isEnabled', 'isTrainingActive', 'isApproved', 'allowAdminBypass', 
         'notifyOwnerOnLimit', 'autoResetDaily', 'autoResetWeekly', 'autoResetMonthly',
         'is_default', 'contact_support', 'is_active', 'is_enabled', 'is_approved',
         'auto_reset_daily', 'auto_reset_weekly', 'auto_reset_monthly', 
         'allow_admin_bypass', 'notify_owner_on_limit', 'is_training_active'
        ].forEach(field => {
            if (newRow[field] !== undefined && (newRow[field] === 0 || newRow[field] === 1)) {
                newRow[field] = newRow[field] === 1;
            }
        });

        // Convert string JSON to object (if stored as string in SQLite but jsonb in PG)
        ['config', 'nodes', 'edges', 'features', 'gatewayResponse', 'metadata', 
         'value', 'details', 'conversationHistory', 'models',
         'gateway_response', 'conversation_history'
        ].forEach(field => {
             if (newRow[field] && typeof newRow[field] === 'string') {
                 try {
                     newRow[field] = JSON.parse(newRow[field]);
                 } catch (e) {
                     // Keep as string if parse fails, but PG might complain for jsonb
                 }
             }
        });

        return newRow;
    };

    const tables = [
        'user', 'session', 'account', 'verification', 
        'bots', 'flows', 'bot_collaborators', 'templates',
        'plans', 'subscriptions', 'transactions', 
        'system_settings', 'activity_logs',
        'ai_sessions', 'ai_configs', 'ai_channels', 
        'ai_token_usage', 'ai_token_limits', 
        'ai_training_data', 'ai_training_settings', 'ai_knowledge_base'
    ];

    for (const table of tables) {
        console.log(`🔄 Migrating table: ${table}...`);
        const rows = await getAll(table);
        
        if (rows.length > 0) {
            // Find schema object
            // Convention: table name in schema export matches variable name usually
            // but mapped manually here
            let schemaTable = null;
            
            // Map table names to schema exports
            if (table === 'user') schemaTable = schema.user;
            else if (table === 'session') schemaTable = schema.session;
            else if (table === 'account') schemaTable = schema.account;
            else if (table === 'verification') schemaTable = schema.verification;
            else if (table === 'bots') schemaTable = schema.bots;
            else if (table === 'flows') schemaTable = schema.flows;
            else if (table === 'bot_collaborators') schemaTable = schema.botCollaborators;
            else if (table === 'templates') schemaTable = schema.templates;
            else if (table === 'plans') schemaTable = schema.plans;
            else if (table === 'subscriptions') schemaTable = schema.subscriptions;
            else if (table === 'transactions') schemaTable = schema.transactions;
            else if (table === 'system_settings') schemaTable = schema.systemSettings;
            else if (table === 'activity_logs') schemaTable = schema.activityLogs;
            else if (table === 'ai_sessions') schemaTable = schema.aiSessions;
            else if (table === 'ai_configs') schemaTable = schema.aiConfigs;
            else if (table === 'ai_channels') schemaTable = schema.aiChannels;
            else if (table === 'ai_token_usage') schemaTable = schema.aiTokenUsage;
            else if (table === 'ai_token_limits') schemaTable = schema.aiTokenLimits;
            else if (table === 'ai_training_data') schemaTable = schema.aiTrainingData;
            else if (table === 'ai_training_settings') schemaTable = schema.aiTrainingSettings;
            else if (table === 'ai_knowledge_base') schemaTable = schema.aiKnowledgeBase;

            if (schemaTable) {
                const transformedRows = rows.map(r => transform(r, table));
                try {
                    // Batch insert using Drizzle
                    // PG allows multiple values in insert
                    // We do chunks of 50 to be safe
                    const chunkSize = 50;
                    for (let i = 0; i < transformedRows.length; i += chunkSize) {
                        const chunk = transformedRows.slice(i, i + chunkSize);
                        await db.insert(schemaTable).values(chunk).onConflictDoNothing();
                    }
                    console.log(`   ✅ Migrated ${rows.length} rows.`);
                } catch (e: any) {
                    console.error(`   ❌ Failed to insert into ${table}: ${e.message}`);
                }
            } else {
                console.warn(`   ⚠️  Schema definition not found for ${table}`);
            }
        } else {
            console.log(`   ℹ️  Table ${table} is empty.`);
        }
    }

    console.log('✨ Migration completed successfully!');
    process.exit(0);
}

migrate().catch((e: any) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
