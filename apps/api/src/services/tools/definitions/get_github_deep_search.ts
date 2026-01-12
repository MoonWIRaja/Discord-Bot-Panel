import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getGithubDeepSearch: ToolDefinition = {
    name: 'get_github_deep_search',
    description: 'Search GitHub for repositories based on a query (e.g. "discord bot sveltekit", "AI agent framework").',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'The search query',
            required: true
        },
        sort: {
            type: 'string',
            description: 'Sort by stars, forks, or updated (default: best match)',
            required: false
        }
    },
    handler: async ({ query, sort }: { query: string; sort?: string }) => {
        console.log(`[Tool:get_github_deep_search] Searching for repositories: "${query}"`);
        try {
            const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}${sort ? `&sort=${sort}` : ''}&per_page=5`;
            const response = await axios.get(url, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            const data = response.data;

            if (!data.items || data.items.length === 0) {
                return "No repositories found for this query.";
            }

            const repos = data.items.map((r: any) => ({
                full_name: r.full_name,
                description: r.description,
                stars: r.stargazers_count,
                updated: new Date(r.updated_at).toLocaleDateString(),
                url: r.html_url
            }));

            return JSON.stringify(repos);
        } catch (error: any) {
            return `GitHub search failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(getGithubDeepSearch);
export default getGithubDeepSearch;
