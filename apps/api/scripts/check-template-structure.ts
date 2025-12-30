import { db } from '../src/db/index.js';
import { templates } from '../src/db/schema.js';

async function checkTemplateStructure() {
    console.log('🔍 Checking template structure in database...\n');
    
    try {
        const allTemplates = await db.select().from(templates);
        
        for (const template of allTemplates) {
            console.log(`\n📋 Template: ${template.name}`);
            console.log(`   Category: ${template.category}`);
            console.log(`   Icon: ${template.icon}`);
            console.log(`   Color: ${template.color}`);
            
            // Check nodes structure
            console.log(`\n   Nodes type: ${typeof template.nodes}`);
            if (Array.isArray(template.nodes)) {
                console.log(`   ✅ Nodes is array: ${template.nodes.length} nodes`);
                console.log(`   Sample node:`, JSON.stringify(template.nodes[0], null, 2));
            } else if (typeof template.nodes === 'string') {
                console.log(`   ⚠️  Nodes is STRING (should be array!)`);
                console.log(`   Value:`, template.nodes.substring(0, 100) + '...');
            } else {
                console.log(`   ❌ Nodes is invalid type!`);
            }
            
            // Check edges structure
            console.log(`\n   Edges type: ${typeof template.edges}`);
            if (Array.isArray(template.edges)) {
                console.log(`   ✅ Edges is array: ${template.edges.length} edges`);
            } else if (typeof template.edges === 'string') {
                console.log(`   ⚠️  Edges is STRING (should be array!)`);
            } else {
                console.log(`   ❌ Edges is invalid type!`);
            }
            
            console.log('\n' + '='.repeat(60));
        }
        
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    
    process.exit(0);
}

checkTemplateStructure();
