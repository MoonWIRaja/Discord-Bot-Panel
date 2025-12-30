import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getCryptoPrice: ToolDefinition = {
    name: 'get_crypto_price',
    description: 'Get real-time cryptocurrency price and market data.',
    category: 'info',
    parameters: {
        coinId: {
            type: 'string',
            description: 'The coin ID (e.g. bitcoin, ethereum, solana)',
            required: true
        },
        currency: {
            type: 'string',
            description: 'Currency (default: usd)',
            required: false
        }
    },
    handler: async ({ coinId, currency }: { coinId: string, currency?: string }) => {
        console.log(`[Tool:get_crypto_price] Fetching price for: ${coinId} in ${currency || 'usd'}`);
        try {
            const vsCur = currency || 'usd';
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCur}&include_24hr_change=true&include_market_cap=true`;
            
            const response = await axios.get(url);
            console.log(`[Tool:get_crypto_price] Got response from CoinGecko`);
            const data = response.data[coinId.toLowerCase()];
            
            if (!data) return `Coin '${coinId}' not found. Try 'bitcoin' or 'ethereum'.`;

            return JSON.stringify({
                price: `${data[vsCur]} ${vsCur.toUpperCase()}`,
                change_24h: `${data[vsCur + '_24h_change'].toFixed(2)}%`,
                market_cap: `${data[vsCur + '_market_cap'].toLocaleString()} ${vsCur.toUpperCase()}`
            });
        } catch (error: any) {
            return `Failed to fetch crypto price: ${error.message}`;
        }
    }
};

ToolRegistry.register(getCryptoPrice);
export default getCryptoPrice;
