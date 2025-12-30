import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const convertCurrency: ToolDefinition = {
    name: 'convert_currency',
    description: 'Convert currency amounts using real-time exchange rates.',
    category: 'info',
    parameters: {
        amount: {
            type: 'number',
            description: 'Amount to convert',
            required: true
        },
        from: {
            type: 'string',
            description: 'Source currency code (e.g. USD, MYR, EUR)',
            required: true
        },
        to: {
            type: 'string',
            description: 'Target currency code (e.g. MYR, USD, JPY)',
            required: true
        }
    },
    handler: async ({ amount, from, to }: { amount: number, from: string, to: string }) => {
        console.log(`[Tool:convert_currency] Converting ${amount} ${from} to ${to}`);
        try {
            const fromCode = from.toUpperCase();
            const toCode = to.toUpperCase();
            
            const url = `https://api.frankfurter.app/latest?amount=${amount}&from=${fromCode}&to=${toCode}`;
            const response = await axios.get(url);
            console.log(`[Tool:convert_currency] Rate fetched for ${response.data.date}`);
            
            const result = response.data.rates[toCode];
            if (!result) return `Currency conversion failed for ${fromCode} to ${toCode}.`;

            return `${amount} ${fromCode} = ${result} ${toCode} (Date: ${response.data.date})`;
        } catch (error: any) {
            return `Conversion failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(convertCurrency);
export default convertCurrency;
