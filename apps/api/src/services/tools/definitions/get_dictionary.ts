import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getDictionary: ToolDefinition = {
    name: 'get_dictionary',
    description: 'Get the definition, pronunciation, and examples for an English word.',
    category: 'info',
    parameters: {
        word: {
            type: 'string',
            description: 'The English word to look up',
            required: true
        }
    },
    handler: async ({ word }: { word: string }) => {
        console.log(`[Tool:get_dictionary] Looking up: ${word}`);
        try {
            const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            const data = response.data[0];

            const meanings = data.meanings.map((m: any) => ({
                partOfSpeech: m.partOfSpeech,
                definitions: m.definitions.slice(0, 3).map((d: any) => ({
                    definition: d.definition,
                    example: d.example || null
                })),
                synonyms: m.synonyms?.slice(0, 5) || [],
                antonyms: m.antonyms?.slice(0, 5) || []
            }));

            console.log(`[Tool:get_dictionary] Found ${meanings.length} meanings`);
            return JSON.stringify({
                word: data.word,
                phonetic: data.phonetic || data.phonetics?.[0]?.text || 'N/A',
                audio: data.phonetics?.find((p: any) => p.audio)?.audio || null,
                meanings: meanings
            });
        } catch (error: any) {
            console.error(`[Tool:get_dictionary] Error:`, error.message);
            return `Word not found: "${word}". Please check the spelling.`;
        }
    }
};

ToolRegistry.register(getDictionary);
export default getDictionary;
