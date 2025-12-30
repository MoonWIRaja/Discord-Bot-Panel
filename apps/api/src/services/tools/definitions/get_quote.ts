import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getQuote: ToolDefinition = {
    name: 'get_quote',
    description: 'Get an inspirational or motivational quote.',
    category: 'fun',
    parameters: {},
    handler: async () => {
        console.log(`[Tool:get_quote] Fetching random quote`);
        try {
            const response = await axios.get('https://api.quotable.io/random');
            const data = response.data;

            console.log(`[Tool:get_quote] Got quote by ${data.author}`);
            return JSON.stringify({
                quote: data.content,
                author: data.author,
                tags: data.tags
            });
        } catch (error: any) {
            // Fallback to ZenQuotes if Quotable fails
            try {
                const fallback = await axios.get('https://zenquotes.io/api/random');
                const quote = fallback.data[0];
                return JSON.stringify({
                    quote: quote.q,
                    author: quote.a
                });
            } catch (e) {
                console.error(`[Tool:get_quote] Error:`, error.message);
                return `Failed to get quote: ${error.message}`;
            }
        }
    }
};

ToolRegistry.register(getQuote);
export default getQuote;
