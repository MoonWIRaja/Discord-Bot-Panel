import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const shortenUrl: ToolDefinition = {
    name: 'shorten_url',
    description: 'Shorten a long URL into a short, shareable link.',
    category: 'utility',
    parameters: {
        url: {
            type: 'string',
            description: 'The URL to shorten',
            required: true
        }
    },
    handler: async ({ url }: { url: string }) => {
        console.log(`[Tool:shorten_url] Shortening: ${url}`);
        try {
            // Validate URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return 'Invalid URL. Please provide a full URL starting with http:// or https://';
            }

            const response = await axios.get(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`);
            const data = response.data;

            if (data.errorcode) {
                return `Failed to shorten URL: ${data.errormessage}`;
            }

            console.log(`[Tool:shorten_url] Shortened to: ${data.shorturl}`);
            return JSON.stringify({
                original: url,
                shortened: data.shorturl
            });
        } catch (error: any) {
            console.error(`[Tool:shorten_url] Error:`, error.message);
            return `Failed to shorten URL: ${error.message}`;
        }
    }
};

ToolRegistry.register(shortenUrl);
export default shortenUrl;
