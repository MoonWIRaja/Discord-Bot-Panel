import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const defineSlang: ToolDefinition = {
    name: 'define_slang',
    description: 'Define slang, internet terms, or phrases using Urban Dictionary.',
    category: 'fun',
    parameters: {
        term: {
            type: 'string',
            description: 'The term to define (e.g. "rizz", "no cap")',
            required: true
        }
    },
    handler: async ({ term }: { term: string }) => {
        console.log(`[Tool:define_slang] Looking up: "${term}"`);
        try {
            const url = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;
            const response = await axios.get(url);
            console.log(`[Tool:define_slang] Got ${response.data.list?.length || 0} definitions`);
            const list = response.data.list;

            if (!list || list.length === 0) {
                return `No definition found for '${term}'.`;
            }

            // Return top 2 definitions
            const topDefs = list.slice(0, 2).map((d: any) => ({
                definition: d.definition.replace(/[\[\]]/g, ''),
                example: d.example.replace(/[\[\]]/g, ''),
                author: d.author,
                thumbs_up: d.thumbs_up
            }));

            return JSON.stringify(topDefs);
        } catch (error: any) {
            return `Failed to fetch definition: ${error.message}`;
        }
    }
};

ToolRegistry.register(defineSlang);
export default defineSlang;
