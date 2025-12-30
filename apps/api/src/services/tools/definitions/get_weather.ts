import axios from 'axios';
import { ToolDefinition, ToolRegistry } from '../registry.js';

const getWeather: ToolDefinition = {
    name: 'get_weather',
    description: 'Get current weather and forecast for any city.',
    category: 'info',
    parameters: {
        city: {
            type: 'string',
            description: 'The city name (e.g. "Tokyo", "New York"). Defaults to server city.',
            required: false
        }
    },
    handler: async ({ city }: { city?: string }) => {
        console.log(`[Tool:get_weather] Called with city=${city}`);
        try {
            const targetCity = city || process.env.SERVER_CITY || 'Kuala Lumpur';
            console.log(`[Tool:get_weather] Fetching weather for ${targetCity}...`);
            // 1. Geocode the city
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetCity)}&count=1&language=en&format=json`;
            const geoRes = await axios.get(geoUrl);
            
            if (!geoRes.data.results || geoRes.data.results.length === 0) {
                return `City '${city}' not found.`;
            }

            const location = geoRes.data.results[0];
            const { latitude, longitude, name, country } = location;

            // 2. Get weather
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
            
            const weatherRes = await axios.get(weatherUrl);
            const current = weatherRes.data.current;
            const daily = weatherRes.data.daily;
            const units = weatherRes.data.current_units;

            // WMO Weather code map could be added here for better descriptions, but for now raw code is ok or simplified
            // We'll let the AI interpret the data broadly or add a simple map if needed.
            // Actually, let's just return the raw data, LLMs are good at interpreting WMO codes.

            return JSON.stringify({
                location: { name, country, lat: latitude, lon: longitude },
                current: {
                    temp: `${current.temperature_2m}${units.temperature_2m}`,
                    feels_like: `${current.apparent_temperature}${units.temperature_2m}`,
                    humidity: `${current.relative_humidity_2m}${units.relative_humidity_2m}`,
                    wind: `${current.wind_speed_10m}${units.wind_speed_10m}`,
                    condition_code: current.weather_code,
                    is_day: current.is_day === 1 ? 'Day' : 'Night'
                },
                forecast_today: {
                    max: `${daily.temperature_2m_max[0]}${units.temperature_2m}`,
                    min: `${daily.temperature_2m_min[0]}${units.temperature_2m}`
                },
                source: "Open-Meteo"
            });
        } catch (error: any) {
            return `Weather check failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(getWeather);
export default getWeather;
