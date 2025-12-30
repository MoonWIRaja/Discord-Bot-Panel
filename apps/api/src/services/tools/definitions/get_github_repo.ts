import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getGithubRepo: ToolDefinition = {
    name: 'get_github_repo',
    description: 'Get information about a GitHub repository including stars, forks, description, and more.',
    category: 'info',
    parameters: {
        owner: {
            type: 'string',
            description: 'Repository owner/username (e.g., "facebook")',
            required: true
        },
        repo: {
            type: 'string',
            description: 'Repository name (e.g., "react")',
            required: true
        }
    },
    handler: async ({ owner, repo }: { owner: string; repo: string }) => {
        console.log(`[Tool:get_github_repo] Looking up: ${owner}/${repo}`);
        try {
            const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            const data = response.data;

            console.log(`[Tool:get_github_repo] Found: ${data.full_name}`);
            return JSON.stringify({
                name: data.full_name,
                description: data.description,
                stars: data.stargazers_count.toLocaleString(),
                forks: data.forks_count.toLocaleString(),
                watchers: data.watchers_count.toLocaleString(),
                open_issues: data.open_issues_count,
                language: data.language,
                topics: data.topics || [],
                license: data.license?.name || 'No license',
                created: new Date(data.created_at).toLocaleDateString(),
                updated: new Date(data.updated_at).toLocaleDateString(),
                homepage: data.homepage || null,
                url: data.html_url
            });
        } catch (error: any) {
            console.error(`[Tool:get_github_repo] Error:`, error.message);
            if (error.response?.status === 404) {
                return `Repository not found: ${owner}/${repo}. Please check the owner and repo name.`;
            }
            return `Failed to get repo info: ${error.message}`;
        }
    }
};

ToolRegistry.register(getGithubRepo);
export default getGithubRepo;
