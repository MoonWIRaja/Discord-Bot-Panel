
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

// Locate the database file
const dbPath = path.resolve(process.cwd(), '../../data.db'); // Adjust path as needed
console.log("Checking DB at:", dbPath);

if (!fs.existsSync(dbPath)) {
    console.error("Database file not found!");
    process.exit(1);
}

const client = createClient({
    url: `file:${dbPath}`
});

(async () => {
    try {
        const result = await client.execute("SELECT * FROM bots");
        console.log("Rows in 'bots' table:");
        console.table(result.rows);
    } catch (e) {
        console.error("Error reading DB:", e);
    }
})();
