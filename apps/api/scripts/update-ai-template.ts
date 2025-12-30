import { db } from '../src/db/index.js';
import { templates } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function updateAITemplate() {
    console.log('🔄 Updating AI Assistant Bot template...\n');
    
    try {
        // Find AI template
        const [aiTemplate] = await db.select()
            .from(templates)
            .where(eq(templates.name, 'AI Assistant Bot'));
        
        if (!aiTemplate) {
            console.log('❌ AI Assistant Bot template not found!');
            process.exit(1);
        }
        
        console.log(`Found template: ${aiTemplate.name}`);
        console.log(`Current nodes: ${Array.isArray(aiTemplate.nodes) ? aiTemplate.nodes.length : 'invalid'}`);
        
        // Keep only Gemini provider node + all command nodes
        const newNodes = Array.isArray(aiTemplate.nodes) 
            ? aiTemplate.nodes.filter((node: any) => {
                // Keep Gemini provider
                if (node.id === 'ai-provider-gemini') return true;
                // Keep all command triggers (not provider nodes)
                if (node.type !== 'aiProvider') return true;
                // Remove other providers
                return false;
            })
            : [];
        
        console.log(`New nodes count: ${newNodes.length}`);
        console.log(`Removed: ${Array.isArray(aiTemplate.nodes) ? aiTemplate.nodes.length - newNodes.length : 0} provider nodes`);
        
        // Update template
        await db.update(templates)
            .set({ 
                nodes: newNodes,
                description: 'Complete AI system with Gemini AI, private rooms (/aichannel), public chat (/aichat), and image generation (/aiimage)!'
            })
            .where(eq(templates.id, aiTemplate.id));
        
        console.log('\n✅ Template updated successfully!');
        
    } catch (e: any) {
        console.error('❌ Error:', e.message);
    }
    
    process.exit(0);
}

updateAITemplate();
