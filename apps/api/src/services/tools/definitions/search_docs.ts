import { search, SafeSearchType } from 'duck-duck-scrape';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const searchDocs: ToolDefinition = {
    name: 'search_docs',
    description: 'Search for technical documentation, API references, and code examples (inspired by Context7).',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'The technical query (e.g. "SvelteKit hooks", "Drizzle ORM relations")',
            required: true
        },
        site: {
            type: 'string',
            description: 'Optional site to limit search (e.g. "developer.mozilla.org", "docs.github.com")',
            required: false
        }
    },
    handler: async ({ query, site }: { query: string, site?: string }) => {
        const fullQuery = site ? `site:${site} ${query}` : `${query} documentation`;
        console.log(`[Tool:search_docs] Searching for documentation: "${fullQuery}"`);
        
        try {
            const results = await search(fullQuery, {
                safeSearch: SafeSearchType.STRICT
            });

            if (!results.results || results.results.length === 0) {
                return "No documentation found.";
            }

            // Return top 5 results with snippets
            const docs = results.results.slice(0, 5).map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.description
            }));

            return JSON.stringify(docs);
        } catch (error: any) {
            return `Documentation search failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(searchDocs);
export default searchDocs;
