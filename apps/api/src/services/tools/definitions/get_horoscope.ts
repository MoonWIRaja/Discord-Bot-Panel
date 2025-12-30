import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

// Horoscope data (since most free APIs are unreliable, we use a simple approach)
const horoscopeData: Record<string, { element: string; traits: string[] }> = {
    aries: { element: 'Fire', traits: ['courageous', 'energetic', 'optimistic'] },
    taurus: { element: 'Earth', traits: ['reliable', 'patient', 'devoted'] },
    gemini: { element: 'Air', traits: ['adaptable', 'curious', 'witty'] },
    cancer: { element: 'Water', traits: ['intuitive', 'loyal', 'protective'] },
    leo: { element: 'Fire', traits: ['confident', 'creative', 'generous'] },
    virgo: { element: 'Earth', traits: ['analytical', 'practical', 'hardworking'] },
    libra: { element: 'Air', traits: ['diplomatic', 'fair', 'social'] },
    scorpio: { element: 'Water', traits: ['passionate', 'determined', 'brave'] },
    sagittarius: { element: 'Fire', traits: ['optimistic', 'adventurous', 'honest'] },
    capricorn: { element: 'Earth', traits: ['disciplined', 'responsible', 'ambitious'] },
    aquarius: { element: 'Air', traits: ['independent', 'original', 'humanitarian'] },
    pisces: { element: 'Water', traits: ['compassionate', 'artistic', 'intuitive'] }
};

const getHoroscope: ToolDefinition = {
    name: 'get_horoscope',
    description: 'Get horoscope information for a zodiac sign.',
    category: 'fun',
    parameters: {
        sign: {
            type: 'string',
            description: 'Zodiac sign: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces',
            required: true
        }
    },
    handler: async ({ sign }: { sign: string }) => {
        console.log(`[Tool:get_horoscope] Looking up: ${sign}`);
        try {
            const normalizedSign = sign.toLowerCase().trim();
            const signData = horoscopeData[normalizedSign];

            if (!signData) {
                return `Invalid zodiac sign: "${sign}". Valid signs are: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces`;
            }

            // Try to get daily horoscope from a free API
            try {
                const response = await axios.post(`https://aztro.samerat.com/?sign=${normalizedSign}&day=today`, {}, { timeout: 5000 });
                const data = response.data;
                
                return JSON.stringify({
                    sign: normalizedSign.charAt(0).toUpperCase() + normalizedSign.slice(1),
                    element: signData.element,
                    traits: signData.traits,
                    date_range: data.date_range,
                    current_date: data.current_date,
                    description: data.description,
                    mood: data.mood,
                    lucky_number: data.lucky_number,
                    lucky_color: data.color,
                    compatibility: data.compatibility
                });
            } catch (e) {
                // Fallback if API fails
                console.log(`[Tool:get_horoscope] API unavailable, using basic info`);
                return JSON.stringify({
                    sign: normalizedSign.charAt(0).toUpperCase() + normalizedSign.slice(1),
                    element: signData.element,
                    traits: signData.traits,
                    note: 'Daily horoscope API unavailable. Showing basic sign information.'
                });
            }
        } catch (error: any) {
            console.error(`[Tool:get_horoscope] Error:`, error.message);
            return `Failed to get horoscope: ${error.message}`;
        }
    }
};

ToolRegistry.register(getHoroscope);
export default getHoroscope;
