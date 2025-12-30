import { search, SafeSearchType } from 'duck-duck-scrape';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const searchWeb: ToolDefinition = {
    name: 'search_web',
    description: 'Search the internet for real-time information, news, or facts.',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'The search query (e.g. "latest tech news", "who won the football match")',
            required: true
        }
    },
    handler: async ({ query }: { query: string }) => {
        console.log(`[Tool:search_web] Searching DuckDuckGo for: "${query}"`);
        try {
            const results = await search(query, {
                safeSearch: SafeSearchType.STRICT
            });
            console.log(`[Tool:search_web] Got ${results.results?.length || 0} results`);

            if (!results.results || results.results.length === 0) {
                return "No results found.";
            }

            // Return top 5 results
            const topResults = results.results.slice(0, 5).map(r => ({
                title: r.title,
                url: r.url,
                description: r.description
            }));

            return JSON.stringify(topResults);
        } catch (error: any) {
            return `Search failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(searchWeb);
export default searchWeb;
