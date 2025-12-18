import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env explicitly to ensure it works even if not loaded in entry point yet (for scripts)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const connection = await mysql.createPool({
  uri: process.env.DATABASE_URL
});

export const db = drizzle(connection, { schema, mode: 'default' });
export { connection };
