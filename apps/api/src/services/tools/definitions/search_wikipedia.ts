import wikipedia from 'wikipedia';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const searchWikipedia: ToolDefinition = {
    name: 'search_wikipedia',
    description: 'Search Wikipedia for summary of a topic.',
    category: 'info',
    parameters: {
        topic: {
            type: 'string',
            description: 'Topic to search (e.g. "Malaysia", "Quantum Physics")',
            required: true
        }
    },
    handler: async ({ topic }: { topic: string }) => {
        console.log(`[Tool:search_wikipedia] Searching for topic: "${topic}"`);
        try {
            const summary = await wikipedia.summary(topic);
            console.log(`[Tool:search_wikipedia] Found: ${summary.title}`);
            return JSON.stringify({
                title: summary.title,
                description: summary.description,
                extract: summary.extract,
                url: summary.content_urls.desktop.page
            });
        } catch (error) {
            return `Wikipedia search failed or topic not found.`;
        }
    }
};

ToolRegistry.register(searchWikipedia);
export default searchWikipedia;
