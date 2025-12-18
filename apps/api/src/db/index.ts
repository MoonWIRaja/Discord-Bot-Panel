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
