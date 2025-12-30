import { db } from '../src/db/index.js';
import { templates } from '../src/db/schema.js';

async function resetTemplates() {
    console.log('🗑️  Deleting old templates...\n');
    
    try {
        const result = await db.delete(templates);
        console.log('✅ All templates deleted!\n');
        
        console.log('Now run: npm run seed\n');
        
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    
    process.exit(0);
}

resetTemplates();
