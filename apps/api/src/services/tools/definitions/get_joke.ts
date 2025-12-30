import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getJoke: ToolDefinition = {
    name: 'get_joke',
    description: 'Get a random joke. Can specify category like programming, misc, dark, pun, spooky, christmas.',
    category: 'fun',
    parameters: {
        category: {
            type: 'string',
            description: 'Optional joke category: programming, misc, dark, pun, spooky, christmas. Leave empty for any.',
            required: false
        }
    },
    handler: async ({ category }: { category?: string }) => {
        console.log(`[Tool:get_joke] Fetching joke (category: ${category || 'any'})`);
        try {
            const cat = category || 'Any';
            const url = `https://v2.jokeapi.dev/joke/${cat}?safe-mode`;
            const response = await axios.get(url);
            const data = response.data;

            if (data.error) {
                return `No joke found for category: ${category}`;
            }

            console.log(`[Tool:get_joke] Got joke type: ${data.type}`);

            if (data.type === 'single') {
                return JSON.stringify({
                    type: 'single',
                    category: data.category,
                    joke: data.joke
                });
            } else {
                return JSON.stringify({
                    type: 'twopart',
                    category: data.category,
                    setup: data.setup,
                    delivery: data.delivery
                });
            }
        } catch (error: any) {
            console.error(`[Tool:get_joke] Error:`, error.message);
            return `Failed to get joke: ${error.message}`;
        }
    }
};

ToolRegistry.register(getJoke);
export default getJoke;
