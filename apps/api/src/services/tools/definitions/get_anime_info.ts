import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getAnimeInfo: ToolDefinition = {
    name: 'get_anime_info',
    description: 'Get information about an anime or manga from MyAnimeList via Jikan API.',
    category: 'info',
    parameters: {
        title: {
            type: 'string',
            description: 'The anime/manga title to search for',
            required: true
        },
        type: {
            type: 'string',
            description: 'Type: "anime" or "manga". Defaults to anime.',
            required: false
        }
    },
    handler: async ({ title, type }: { title: string; type?: string }) => {
        console.log(`[Tool:get_anime_info] Searching for: ${title} (${type || 'anime'})`);
        try {
            const searchType = type === 'manga' ? 'manga' : 'anime';
            const response = await axios.get(`https://api.jikan.moe/v4/${searchType}?q=${encodeURIComponent(title)}&limit=1`);
            const data = response.data.data[0];

            if (!data) {
                return `No ${searchType} found with title: "${title}"`;
            }

            console.log(`[Tool:get_anime_info] Found: ${data.title}`);
            return JSON.stringify({
                title: data.title,
                title_japanese: data.title_japanese,
                type: data.type,
                episodes: data.episodes || data.chapters || 'N/A',
                status: data.status,
                score: data.score,
                scored_by: data.scored_by?.toLocaleString() || 'N/A',
                rank: data.rank,
                synopsis: data.synopsis?.substring(0, 500) + (data.synopsis?.length > 500 ? '...' : ''),
                genres: data.genres?.map((g: any) => g.name) || [],
                year: data.year || data.published?.prop?.from?.year || 'N/A',
                url: data.url,
                image: data.images?.jpg?.image_url
            });
        } catch (error: any) {
            console.error(`[Tool:get_anime_info] Error:`, error.message);
            return `Failed to search anime: ${error.message}`;
        }
    }
};

ToolRegistry.register(getAnimeInfo);
export default getAnimeInfo;
