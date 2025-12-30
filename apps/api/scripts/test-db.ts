import { db, client } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Testing database connection...');
    const result = await client.execute('SELECT 1');
    console.log('Connection successful!', result);
    process.exit(0);
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
}

main();
