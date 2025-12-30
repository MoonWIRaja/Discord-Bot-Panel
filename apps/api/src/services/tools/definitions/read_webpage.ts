import axios from 'axios';
import * as cheerio from 'cheerio';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const readWebpage: ToolDefinition = {
    name: 'read_webpage',
    description: 'Read and extract full text content from any webpage URL. Use this to get detailed information from news articles, blog posts, documentation, or any website.',
    category: 'search',
    parameters: {
        url: {
            type: 'string',
            description: 'The full URL to read (e.g. "https://example.com/article")',
            required: true
        }
    },
    handler: async ({ url }: { url: string }) => {
        console.log(`[Tool:read_webpage] Fetching: ${url}`);
        try {
            // Validate URL
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return 'Invalid URL. Please provide a full URL starting with http:// or https://';
            }

            // Fetch the webpage with a reasonable timeout
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                maxRedirects: 5
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, iframe, noscript, .ads, .advertisement, .sidebar, .menu, .navigation').remove();

            // Extract page metadata
            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';

            // Extract main content
            // Try common content selectors first
            let mainContent = '';
            const contentSelectors = [
                'article',
                'main',
                '.content',
                '.post-content',
                '.article-content',
                '.entry-content',
                '#content',
                '.story-body',
                '.article-body'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    mainContent = element.text();
                    break;
                }
            }

            // Fallback to body if no main content found
            if (!mainContent) {
                mainContent = $('body').text();
            }

            // Clean up the text
            mainContent = mainContent
                .replace(/\s+/g, ' ')  // Collapse whitespace
                .replace(/\n\s*\n/g, '\n')  // Remove empty lines
                .trim();

            // Limit content length to avoid token overflow (max ~8000 chars)
            const maxLength = 8000;
            if (mainContent.length > maxLength) {
                mainContent = mainContent.substring(0, maxLength) + '... [content truncated]';
            }

            console.log(`[Tool:read_webpage] Extracted ${mainContent.length} characters from ${url}`);

            return JSON.stringify({
                url: url,
                title: title,
                description: metaDescription || ogDescription || '',
                content: mainContent,
                content_length: mainContent.length
            });

        } catch (error: any) {
            console.error(`[Tool:read_webpage] Error:`, error.message);
            if (error.code === 'ECONNABORTED') {
                return `Timeout: The webpage took too long to respond.`;
            }
            if (error.response?.status === 403) {
                return `Access denied: This website blocks automated requests.`;
            }
            if (error.response?.status === 404) {
                return `Page not found: The URL does not exist.`;
            }
            return `Failed to read webpage: ${error.message}`;
        }
    }
};

ToolRegistry.register(readWebpage);
export default readWebpage;
