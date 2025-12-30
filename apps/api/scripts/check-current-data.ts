import { db } from '../src/db/index.js';
import { templates, flows, bots } from '../src/db/schema.js';

async function checkData() {
    console.log('🔍 Checking current database state...\n');
    
    try {
        const allTemplates = await db.select().from(templates);
        console.log(`📋 Templates: ${allTemplates.length} found`);
        allTemplates.forEach(t => {
            console.log(`   - ${t.name} (${t.category})`);
        });
        
        const allBots = await db.select().from(bots);
        console.log(`\n🤖 Bots: ${allBots.length} found`);
        allBots.forEach(b => {
            console.log(`   - ${b.name}`);
        });
        
        const allFlows = await db.select().from(flows);
        console.log(`\n⚡ Flows: ${allFlows.length} found`);
        allFlows.forEach(f => {
            console.log(`   - ${f.name} (Bot: ${f.botId})`);
});
        
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    
    process.exit(0);
}

checkData();
