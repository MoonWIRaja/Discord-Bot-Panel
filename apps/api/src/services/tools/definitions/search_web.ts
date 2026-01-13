import { search, SafeSearchType } from 'duck-duck-scrape';
import { ToolDefinition, ToolRegistry } from '../registry.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

// Initialize puppeteer-extra with stealth plugin
puppeteer.use(StealthPlugin());

const searchWeb: ToolDefinition = {
    name: 'search_web',
    description: 'Advanced web search with deep-reading. This tool not only searches but also automatically visits and reads the top results using a professional stealth browser to provide the most accurate and up-to-date information.',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'The search query (e.g. "latest tech news", "who won the football match")',
            required: true
        }
    },
    handler: async ({ query }: { query: string }) => {
        const tavilyKey = process.env.TAVILY_API_KEY;
        let searchResults: any[] = [];
        let searchNote = '';

        if (tavilyKey) {
            console.log(`[Tool:search_web] Searching Tavily for: "${query}"`);
            try {
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: tavilyKey,
                        query: query,
                        search_depth: "advanced",
                        max_results: 5
                    })
                });
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    searchResults = data.results.map((r: any) => ({
                        title: r.title,
                        url: r.url,
                        snippet: r.content
                    }));
                }
            } catch (error: any) {
                console.error(`[Tool:search_web] Tavily failed: ${error.message}`);
                searchNote = `Tavily search failed: ${error.message}. `;
            }
        } else {
            console.log(`[Tool:search_web] Tavily key missing, using DuckDuckGo`);
            searchNote = "Tavily API key missing. Suggest adding TAVILY_API_KEY to .env for better search. ";
        }

        if (searchResults.length === 0) {
            console.log(`[Tool:search_web] Searching DuckDuckGo for: "${query}"`);
            try {
                const results = await search(query, { safeSearch: SafeSearchType.STRICT });
                if (results.results && results.results.length > 0) {
                    searchResults = results.results.slice(0, 5).map(r => ({
                        title: r.title,
                        url: r.url,
                        snippet: r.description
                    }));
                }
            } catch (error: any) {
                console.error(`[Tool:search_web] DuckDuckGo failed: ${error.message}`);
                searchNote += `DuckDuckGo failed: ${error.message}`;
            }
        }

        if (searchResults.length === 0) {
            return `No search results found. ${searchNote}`.trim();
        }

        // AUTO-READ OVERKILL FEATURE: Visit top 3 URLs to get full context
        console.log(`[Tool:search_web] Auto-reading top 3 results for query: "${query}"`);
        const topResults = searchResults.slice(0, 3);
        const detailedResults = [];
        let puppeteerFailed = false;

        // Try Puppeteer first, fall back to fetch if it fails
        let browser;
        try {
            browser = await (puppeteer as any).launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1280,800']
            });

            for (const result of topResults) {
                try {
                    const page = await browser.newPage();
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

                    // Set viewport
                    await page.setViewport({ width: 1280, height: 800 });

                    console.log(`[Tool:search_web] Visiting (Stealth Puppeteer): ${result.url}`);
                    await page.goto(result.url, { waitUntil: 'networkidle2', timeout: 20000 });

                    // Stabilization wait
                    await new Promise(r => setTimeout(r, 2000));

                    const html = await page.content();
                    const $ = cheerio.load(html);
                    $('script, style, nav, footer, header').remove();

                    const content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000);
                    detailedResults.push({
                        title: result.title,
                        url: result.url,
                        full_content_snippet: content
                    });

                    await page.close();
                } catch (e: any) {
                    console.log(`[Tool:search_web] Puppeteer failed to read ${result.url}: ${e.message}`);
                    detailedResults.push(result); // Fallback to snippet
                }
            }
        } catch (error: any) {
            console.error(`[Tool:search_web] Puppeteer launch failed: ${error.message}`);
            puppeteerFailed = true;
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {
                    console.log(`[Tool:search_web] Error closing browser: ${e}`);
                }
            }
        }

        // Fallback: Use fetch + cheerio if Puppeteer failed completely
        if (puppeteerFailed && detailedResults.length === 0) {
            console.log(`[Tool:search_web] Falling back to fetch API for reading pages`);
            for (const result of topResults) {
                try {
                    console.log(`[Tool:search_web] Fetching (fallback): ${result.url}`);
                    const response = await fetch(result.url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const html = await response.text();
                    const $ = cheerio.load(html);
                    $('script, style, nav, footer, header').remove();

                    const content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1500);
                    detailedResults.push({
                        title: result.title,
                        url: result.url,
                        full_content_snippet: content
                    });
                } catch (e: any) {
                    console.log(`[Tool:search_web] Fetch fallback failed for ${result.url}: ${e.message}`);
                    detailedResults.push(result); // Final fallback to snippet
                }
            }
        }

        return JSON.stringify({
            query: query,
            summary: `Found ${searchResults.length} results. Deep-read the top 3 sources.`,
            detailed_results: detailedResults,
            other_results: searchResults.slice(3)
        });
    }
};

ToolRegistry.register(searchWeb);
export default searchWeb;
