import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getCountryInfo: ToolDefinition = {
    name: 'get_country_info',
    description: 'Get detailed information about a country including capital, population, languages, currency, etc.',
    category: 'info',
    parameters: {
        country: {
            type: 'string',
            description: 'Country name (e.g., "Malaysia", "Japan", "United States")',
            required: true
        }
    },
    handler: async ({ country }: { country: string }) => {
        console.log(`[Tool:get_country_info] Looking up: ${country}`);
        try {
            const response = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}`);
            const data = response.data[0];

            console.log(`[Tool:get_country_info] Found: ${data.name.common}`);
            return JSON.stringify({
                name: data.name.common,
                official_name: data.name.official,
                capital: data.capital?.[0] || 'N/A',
                region: data.region,
                subregion: data.subregion,
                population: data.population.toLocaleString(),
                languages: Object.values(data.languages || {}),
                currencies: Object.values(data.currencies || {}).map((c: any) => `${c.name} (${c.symbol})`),
                timezones: data.timezones,
                flag_emoji: data.flag,
                borders: data.borders || []
            });
        } catch (error: any) {
            console.error(`[Tool:get_country_info] Error:`, error.message);
            return `Country not found: ${country}. Please check the spelling.`;
        }
    }
};

ToolRegistry.register(getCountryInfo);
export default getCountryInfo;
