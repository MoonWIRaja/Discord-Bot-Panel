import { ToolDefinition, ToolRegistry } from '../registry.js';

// Common words/patterns for language detection
const languagePatterns: { lang: string; name: string; patterns: RegExp[] }[] = [
    { lang: 'ms', name: 'Malay', patterns: [/\b(dan|atau|untuk|yang|dengan|ini|itu|ada|tidak|saya|anda|kamu|kami|mereka|adalah|akan|boleh|sudah|sangat|juga|lagi|macam|nak|tak|jer|lah|kan|pun)\b/i] },
    { lang: 'id', name: 'Indonesian', patterns: [/\b(dan|atau|untuk|yang|dengan|ini|itu|ada|tidak|saya|anda|kamu|kami|mereka|adalah|akan|bisa|sudah|sangat|juga|lagi|apa|bagaimana|kenapa|dimana)\b/i] },
    { lang: 'zh', name: 'Chinese', patterns: [/[\u4e00-\u9fff]/] },
    { lang: 'ja', name: 'Japanese', patterns: [/[\u3040-\u309f\u30a0-\u30ff]/] },
    { lang: 'ko', name: 'Korean', patterns: [/[\uac00-\ud7af\u1100-\u11ff]/] },
    { lang: 'ar', name: 'Arabic', patterns: [/[\u0600-\u06ff]/] },
    { lang: 'hi', name: 'Hindi', patterns: [/[\u0900-\u097f]/] },
    { lang: 'th', name: 'Thai', patterns: [/[\u0e00-\u0e7f]/] },
    { lang: 'ru', name: 'Russian', patterns: [/[\u0400-\u04ff]/] },
    { lang: 'de', name: 'German', patterns: [/\b(und|oder|für|ist|sind|haben|werden|nicht|auch|nach|noch|dann|wenn|aber|als|nur)\b/i, /ß|ü|ö|ä/] },
    { lang: 'fr', name: 'French', patterns: [/\b(et|ou|pour|est|sont|avoir|être|pas|aussi|après|encore|puis|quand|mais|comme|seulement|je|tu|vous|nous)\b/i, /[àâäéèêëîïôùûü]/] },
    { lang: 'es', name: 'Spanish', patterns: [/\b(y|o|para|es|son|tener|ser|no|también|después|todavía|entonces|cuando|pero|como|solo|yo|tú|usted|nosotros)\b/i, /[áéíóúñ¿¡]/] },
    { lang: 'pt', name: 'Portuguese', patterns: [/\b(e|ou|para|é|são|ter|ser|não|também|depois|ainda|então|quando|mas|como|só|eu|tu|você|nós)\b/i, /[áàâãéêíóôõúç]/] },
    { lang: 'it', name: 'Italian', patterns: [/\b(e|o|per|è|sono|avere|essere|non|anche|dopo|ancora|poi|quando|ma|come|solo|io|tu|lei|noi)\b/i, /[àèéìíîòóùú]/] },
    { lang: 'en', name: 'English', patterns: [/\b(the|and|or|for|is|are|have|be|not|also|after|still|then|when|but|as|only|I|you|we|they|this|that|with|from|what|how|why|where)\b/i] }
];

const detectLanguage: ToolDefinition = {
    name: 'detect_language',
    description: 'Detect the language of a given text.',
    category: 'utility',
    parameters: {
        text: {
            type: 'string',
            description: 'The text to analyze for language detection',
            required: true
        }
    },
    handler: async ({ text }: { text: string }) => {
        console.log(`[Tool:detect_language] Analyzing text (${text.length} chars)`);
        try {
            const scores: { lang: string; name: string; score: number }[] = [];

            for (const lang of languagePatterns) {
                let matchCount = 0;
                for (const pattern of lang.patterns) {
                    const matches = text.match(new RegExp(pattern.source, 'gi'));
                    if (matches) {
                        matchCount += matches.length;
                    }
                }
                if (matchCount > 0) {
                    scores.push({ lang: lang.lang, name: lang.name, score: matchCount });
                }
            }

            // Sort by score descending
            scores.sort((a, b) => b.score - a.score);

            if (scores.length === 0) {
                return JSON.stringify({
                    detected: 'unknown',
                    confidence: 'low',
                    message: 'Could not reliably detect language'
                });
            }

            const topResult = scores[0];
            const confidence = topResult.score > 10 ? 'high' : topResult.score > 3 ? 'medium' : 'low';

            console.log(`[Tool:detect_language] Detected: ${topResult.name} (${confidence})`);
            return JSON.stringify({
                detected_language: topResult.name,
                language_code: topResult.lang,
                confidence: confidence,
                alternatives: scores.slice(1, 3).map(s => s.name)
            });
        } catch (error: any) {
            console.error(`[Tool:detect_language] Error:`, error.message);
            return `Language detection failed: ${error.message}`;
        }
    }
};

ToolRegistry.register(detectLanguage);
export default detectLanguage;
