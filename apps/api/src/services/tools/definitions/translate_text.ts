import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const translateText: ToolDefinition = {
    name: 'translate_text',
    description: 'Translate text between languages. Uses MyMemory free translation API.',
    category: 'utility',
    parameters: {
        text: {
            type: 'string',
            description: 'The text to translate',
            required: true
        },
        from: {
            type: 'string',
            description: 'Source language code (e.g., en, ms, zh, ar, ja). Use "auto" for auto-detect.',
            required: false
        },
        to: {
            type: 'string',
            description: 'Target language code (e.g., en, ms, zh, ar, ja)',
            required: true
        }
    },
    handler: async ({ text, from, to }: { text: string; from?: string; to: string }) => {
        console.log(`[Tool:translate_text] Translating from ${from || 'auto'} to ${to}`);
        try {
            const sourceLang = from || 'en';
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${to}`;
            const response = await axios.get(url);
            const data = response.data;

            if (data.responseStatus !== 200) {
                return `Translation failed: ${data.responseDetails || 'Unknown error'}`;
            }

            console.log(`[Tool:translate_text] Success!`);
            return JSON.stringify({
                original: text,
                translated: data.responseData.translatedText,
                from: sourceLang,
                to: to,
                confidence: data.responseData.match || null
            });
        } catch (error: any) {
            console.error(`[Tool:translate_text] Error:`, error.message);
            return `Translation failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(translateText);
export default translateText;
