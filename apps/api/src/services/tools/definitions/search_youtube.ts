import YouTube from 'youtube-sr';
// @ts-ignore
const searchFn = YouTube.search || (YouTube as any).default?.search;
import { ToolDefinition, ToolRegistry } from '../registry.js';

const searchYoutube: ToolDefinition = {
    name: 'search_youtube',
    description: 'Search for YouTube videos.',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'Search terms',
            required: true
        }
    },
    handler: async ({ query }: { query: string }) => {
        console.log(`[Tool:search_youtube] Searching for: "${query}"`);
        try {
            const videos = await searchFn(query, { limit: 5 });
            console.log(`[Tool:search_youtube] Found ${videos.length} videos`);
            if (videos.length === 0) return "No videos found.";
            
            return JSON.stringify(videos.map((v: any) => ({
                title: v.title,
                channel: v.channel?.name,
                duration: v.durationFormatted,
                views: v.views,
                url: v.url
            })));
        } catch (error: any) {
            return `YouTube search failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(searchYoutube);
export default searchYoutube;
