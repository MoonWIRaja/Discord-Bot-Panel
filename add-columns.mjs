// Quick script to add missing columns to templates table
import Database from 'libsql';

const db = new Database('./data.db');

try {
    db.exec('ALTER TABLE templates ADD COLUMN created_by TEXT');
    console.log('Added created_by column');
} catch (e) {
    console.log('created_by column may already exist:', e.message);
}

try {
    db.exec('ALTER TABLE templates ADD COLUMN creator_name TEXT');
    console.log('Added creator_name column');
} catch (e) {
    console.log('creator_name column may already exist:', e.message);
}

console.log('Done!');
