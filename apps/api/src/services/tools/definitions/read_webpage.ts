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
        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'Invalid URL. Please provide a full URL starting with http:// or https://';
        }

        // Try Puppeteer first, fall back to fetch if it fails
        let puppeteerResult = null;
        let puppeteerError = null;

        // === Try Puppeteer ===
        console.log(`[Tool:read_webpage] Using Puppeteer for: ${url}`);
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
                    '--disable-gpu',
                    '--window-size=1280,800'
                ]
            });

            const page = await browser.newPage();

            // Set extra headers and user agent to look real
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
            });

            // Set viewport
            await page.setViewport({ width: 1280, height: 800 });

            console.log(`[Tool:read_webpage] Navigating to: ${url}`);
            await page.goto(url, {
                waitUntil: 'networkidle2', // Wait for network to be idle
                timeout: 45000
            });

            // Handle JS-heavy sites (like krackeddev.com) that might have a loading screen
            // We'll wait a bit more and check if the body has content or specific loading tags
            console.log(`[Tool:read_webpage] Waiting for page to stabilize...`);
            await new Promise(r => setTimeout(r, 3000)); // Baseline wait for animations/initial JS

            // Special check: if the page is still "Loading", wait longer
            const isLoading = await page.evaluate(() => {
                const text = document.body.innerText.toLowerCase();
                return text.includes('loading') && text.length < 500;
            });

            if (isLoading) {
                console.log(`[Tool:read_webpage] Page seems to be loading, waiting up to 10 more seconds...`);
                await new Promise(r => setTimeout(r, 7000));
            }

            // Scroll down a bit to trigger lazy loading
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1000));

            const html = await page.content();
            const $ = cheerio.load(html);

            // Clean up the DOM
            $('script, style, nav, header, footer, aside, iframe, noscript, .ads, .advertisement, .sidebar, .menu, .navigation').remove();

            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';

            let mainContent = '';
            const contentSelectors = [
                'article', 'main', '.content', '.post-content', '.article-content',
                '.entry-content', '#content', '.story-body', '.article-body', '.main-container'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    mainContent = element.text();
                    break;
                }
            }

            if (!mainContent || mainContent.length < 200) {
                mainContent = $('body').text();
            }

            mainContent = mainContent
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            const maxLength = 10000;
            if (mainContent.length > maxLength) {
                mainContent = mainContent.substring(0, maxLength) + '... [content truncated]';
            }

            puppeteerResult = {
                url: url,
                title: title,
                description: metaDescription || ogDescription || '',
                content: mainContent,
                content_length: mainContent.length
            };

            console.log(`[Tool:read_webpage] Puppeteer success: extracted ${mainContent.length} chars`);

        } catch (error: any) {
            puppeteerError = error;
            console.error(`[Tool:read_webpage] Puppeteer failed: ${error.message}`);
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {
                    console.log(`[Tool:read_webpage] Error closing browser: ${e}`);
                }
            }
        }

        // === Return Puppeteer result if successful ===
        if (puppeteerResult) {
            return JSON.stringify(puppeteerResult);
        }

        // === Fallback: Use fetch API ===
        console.log(`[Tool:read_webpage] Falling back to fetch API for: ${url}`);
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            $('script, style, nav, header, footer, aside, iframe, noscript, .ads, .advertisement, .sidebar, .menu, .navigation').remove();

            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const ogDescription = $('meta[property="og:description"]').attr('content') || '';

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

            mainContent = mainContent
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            const maxLength = 8000;
            if (mainContent.length > maxLength) {
                mainContent = mainContent.substring(0, maxLength) + '... [content truncated]';
            }

            console.log(`[Tool:read_webpage] Fetch fallback success: extracted ${mainContent.length} chars`);

            return JSON.stringify({
                url: url,
                title: title,
                description: metaDescription || ogDescription || '',
                content: mainContent,
                content_length: mainContent.length,
                note: 'Content fetched via fallback (fetch API) - Puppeteer was not available'
            });

        } catch (fetchError: any) {
            console.error(`[Tool:read_webpage] Fetch fallback also failed: ${fetchError.message}`);
            return `Failed to read webpage: ${puppeteerError?.message || 'Unknown error'} (Puppeteer unavailable, fetch also failed: ${fetchError.message})`;
        }
    }
};

ToolRegistry.register(readWebpage);
export default readWebpage;
