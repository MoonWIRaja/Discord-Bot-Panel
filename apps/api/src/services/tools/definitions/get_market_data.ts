import { ToolDefinition, ToolRegistry } from '../registry.js';

const getMarketData: ToolDefinition = {
    name: 'get_market_data',
    description: 'Get real-time market data for stocks and cryptocurrencies.',
    category: 'search',
    parameters: {
        symbol: {
            type: 'string',
            description: 'The stock or crypto symbol (e.g. "BTC", "AAPL", "ETH")',
            required: true
        }
    },
    handler: async ({ symbol }: { symbol: string }) => {
        console.log(`[Tool:get_market_data] Fetching data for: "${symbol}"`);
        
        try {
            // Using CoinGecko for crypto and a generic stock fallback (or user can add AlphaVantage key)
            const lowerSymbol = symbol.toLowerCase();
            const cryptoResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${lowerSymbol}&vs_currencies=usd&include_24hr_change=true`);
            const cryptoData = await cryptoResponse.json();

            if (cryptoData[lowerSymbol]) {
                return JSON.stringify({
                    symbol: symbol.toUpperCase(),
                    price: `$${cryptoData[lowerSymbol].usd}`,
                    change24h: `${cryptoData[lowerSymbol].usd_24h_change?.toFixed(2)}%`,
                    source: 'CoinGecko'
                });
            }

            // Fallback to stock data or more broad search
            return `Could not find direct market data for ${symbol}. You might want to use search_web for broad market info.`;
        } catch (error: any) {
            return `Error fetching market data: ${error.message}`;
        }
    }
};

ToolRegistry.register(getMarketData);
export default getMarketData;
