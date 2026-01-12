import { ToolDefinition, ToolRegistry } from '../registry.js';

const getNews: ToolDefinition = {
    name: 'get_news',
    description: 'Get latest news on a specific topic or general news.',
    category: 'search',
    parameters: {
        query: {
            type: 'string',
            description: 'The topic to search news for (e.g. "AI technology", "Malaysia economy")',
            required: true
        },
        category: {
            type: 'string',
            description: 'Optional news category (business, entertainment, general, health, science, sports, technology)',
            required: false
        }
    },
    handler: async ({ query, category }: { query: string, category?: string }) => {
        console.log(`[Tool:get_news] Searching for news: "${query}"${category ? ` in category ${category}` : ''}`);
        
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
            return "News API key is not configured. Please set NEWS_API_KEY in .env file.";
        }

        try {
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&pageSize=5`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'ok') {
                return `Failed to fetch news: ${data.message || 'Unknown error'}`;
            }

            if (!data.articles || data.articles.length === 0) {
                return "No news found for this topic.";
            }

            const articles = data.articles.map((a: any) => ({
                source: a.source.name,
                author: a.author,
                title: a.title,
                description: a.description,
                url: a.url,
                publishedAt: a.publishedAt
            }));

            return JSON.stringify(articles);
        } catch (error: any) {
            return `Error fetching news: ${error.message}`;
        }
    }
};

ToolRegistry.register(getNews);
export default getNews;
