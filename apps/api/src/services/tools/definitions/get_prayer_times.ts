import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getPrayerTimes: ToolDefinition = {
    name: 'get_prayer_times',
    description: 'Get accurate prayer times (Solat) for any city in Malaysia or worldwide.',
    category: 'info',
    parameters: {
        city: {
            type: 'string',
            description: 'The city name (e.g. "Kuala Lumpur", "Johor Bahru", "London"). Defaults to server city.',
            required: false
        },
        country: {
            type: 'string',
            description: 'The country name. Defaults to server country.',
            required: false
        }
    },
    handler: async ({ city, country }: { city?: string, country?: string }) => {
        console.log(`[Tool:get_prayer_times] Called with city=${city}, country=${country}`);
        try {
            const targetCity = city || process.env.SERVER_CITY || 'Kuala Lumpur';
            const targetCountry = country || process.env.SERVER_COUNTRY || 'Malaysia';
            console.log(`[Tool:get_prayer_times] Fetching from Aladhan API for ${targetCity}, ${targetCountry}...`);
            
            const url = `http://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(targetCity)}&country=${encodeURIComponent(targetCountry)}&method=11`; // Method 11 = JAKIM
            
            const response = await axios.get(url);
            const data = response.data.data;
            const timings = data.timings;
            const date = data.date.readable;
            const hijri = `${data.date.hijri.day} ${data.date.hijri.month.en} ${data.date.hijri.year}`;

            return JSON.stringify({
                location: `${targetCity}, ${targetCountry}`,
                date: date,
                hijri: hijri,
                timings: {
                    Subuh: timings.Fajr,
                    Syuruk: timings.Sunrise,
                    Zohor: timings.Dhuhr,
                    Asar: timings.Asr,
                    Maghrib: timings.Maghrib,
                    Isyak: timings.Isha
                },
                source: "JAKIM (via Aladhan API)"
            });
        } catch (error: any) {
            return `Failed to fetch prayer times: ${error.message}`;
        }
    }
};

ToolRegistry.register(getPrayerTimes);
export default getPrayerTimes;
