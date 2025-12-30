import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getNumberFact: ToolDefinition = {
    name: 'get_number_fact',
    description: 'Get an interesting fact about a number.',
    category: 'fun',
    parameters: {
        number: {
            type: 'number',
            description: 'The number',
            required: true
        },
        type: {
            type: 'string',
            description: 'Type of fact: trivia, math, date, year',
            required: false,
            enum: ['trivia', 'math', 'date', 'year']
        }
    },
    handler: async ({ number, type }: { number: number, type?: string }) => {
        console.log(`[Tool:get_number_fact] Looking up fact for number: ${number} (type: ${type || 'trivia'})`);
        try {
            const factType = type || 'trivia';
            const url = `http://numbersapi.com/${number}/${factType}`;
            const response = await axios.get(url);
            console.log(`[Tool:get_number_fact] Got fact successfully`);
            
            return response.data;
        } catch (error: any) {
            return `Failed to fetch fact: ${error.message}`;
        }
    }
};

ToolRegistry.register(getNumberFact);
export default getNumberFact;
