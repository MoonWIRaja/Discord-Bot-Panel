import pg from 'pg';
const { Client } = pg;

async function createDb() {
    console.log('🏗️  Attempting to create database: discord_bot_panel...');
    
    // Connect to default 'postgres' database
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });

    try {
        await client.connect();
        
        // Check if exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'discord_bot_panel'");
        if (res.rowCount === 0) {
            await client.query('CREATE DATABASE discord_bot_panel');
            console.log('✅ Database created successfully!');
        } else {
            console.log('ℹ️  Database already exists.');
        }
    } catch (e: any) {
        console.error('❌ Failed to create database:', e.message);
    } finally {
        await client.end();
    }
}

createDb();
