import { search, SafeSearchType } from 'duck-duck-scrape';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const searchWeb: ToolDefinition = {
    name: 'search_web',
    description: 'Advanced web search to find real-time information, facts, and answers on the internet.',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'The search query (e.g. "latest tech news", "who won the football match")',
            required: true
        }
    },
    handler: async ({ query }: { query: string }) => {
        const tavilyKey = process.env.TAVILY_API_KEY;

        if (tavilyKey) {
            console.log(`[Tool:search_web] Searching Tavily for: "${query}"`);
            try {
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: tavilyKey,
                        query: query,
                        search_depth: "advanced",
                        max_results: 5
                    })
                });
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const results = data.results.map((r: any) => ({
                        title: r.title,
                        url: r.url,
                        snippet: r.content,
                        score: r.score
                    }));
                    return JSON.stringify(results);
                }
            } catch (error: any) {
                console.error(`[Tool:search_web] Tavily failed: ${error.message}, falling back to DuckDuckGo`);
            }
        }

        console.log(`[Tool:search_web] Searching DuckDuckGo for: "${query}"`);
        try {
            const results = await search(query, {
                safeSearch: SafeSearchType.STRICT
            });

            if (!results.results || results.results.length === 0) {
                return "No results found.";
            }

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
