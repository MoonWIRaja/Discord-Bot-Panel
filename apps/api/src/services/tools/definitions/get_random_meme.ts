import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getRandomMeme: ToolDefinition = {
    name: 'get_random_meme',
    description: 'Get a random viral meme from Reddit.',
    category: 'fun',
    parameters: {
        subreddit: {
            type: 'string',
            description: 'Optional subreddit (default: memes)',
            required: false
        }
    },
    handler: async ({ subreddit }: { subreddit?: string }) => {
        console.log(`[Tool:get_random_meme] Fetching from subreddit: ${subreddit || 'memes'}`);
        try {
            const sub = subreddit || 'memes';
            const url = `https://www.reddit.com/r/${sub}/random.json`;
            const response = await axios.get(url);
            console.log(`[Tool:get_random_meme] Got response from Reddit`);
            
            // Reddit API returns array, first item has data.children array
            const post = response.data[0]?.data?.children[0]?.data;
            
            if (!post) return "Failed to fetch meme.";

            return JSON.stringify({
                title: post.title,
                url: post.url,
                subreddit: post.subreddit,
                ups: post.ups
            });
        } catch (error: any) {
            return `Failed to fetch meme: ${error.message}`;
        }
    }
};

ToolRegistry.register(getRandomMeme);
export default getRandomMeme;
