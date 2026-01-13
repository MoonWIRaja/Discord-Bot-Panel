import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const readWebpage: ToolDefinition = {
    name: 'read_webpage',
    description: 'Read and extract full text content from any webpage URL. Use this to get detailed information from news articles, blog posts, documentation, or any website. This tool uses a real browser to handle JavaScript-heavy sites.',
    category: 'search',
    parameters: {
        url: {
            type: 'string',
            description: 'The full URL to read (e.g. "https://example.com/article")',
            required: true
        }
    },
    handler: async ({ url }: { url: string }) => {
        console.log(`[Tool:read_webpage] Fetching (Puppeteer): ${url}`);

        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'Invalid URL. Please provide a full URL starting with http:// or https://';
        }

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();

            // Set a realistic User-Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Navigate to URL
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Get HTML content after JS execution
            const html = await page.content();
            const $ = cheerio.load(html);

            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, iframe, noscript, .ads, .advertisement, .sidebar, .menu, .navigation').remove();

            // Extract page metadata
            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';

            // Extract main content
            let mainContent = '';
            const contentSelectors = [
                'article', 'main', '.content', '.post-content', '.article-content',
                '.entry-content', '#content', '.story-body', '.article-body'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    mainContent = element.text();
                    break;
                }
            }

            if (!mainContent) {
                mainContent = $('body').text();
            }

            // Clean up the text
            mainContent = mainContent
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

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
            return `Failed to read webpage: ${error.message}`;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
};

ToolRegistry.register(readWebpage);
export default readWebpage;
