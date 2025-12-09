import { GoogleGenAI, Type } from "@google/genai";
import { FALLBACK_ELIMINATIONS } from "../constants";

// Initialize Gemini Client
// In a real app, ensure process.env.API_KEY is defined.
// If it's undefined, we fallback gracefully.
const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize Gemini Client", e);
  }
}

/**
 * Fetches a batch of creative elimination messages.
 * We fetch these at the start of the battle to avoid latency during the fast-paced UI updates.
 */
export const fetchEliminationNarratives = async (count: number = 10): Promise<string[]> => {
  if (!ai) return FALLBACK_ELIMINATIONS;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate ${count} short, intense, sci-fi style elimination descriptions for a battle royale log.
      Use the placeholders "{victim}" and optionally "{attacker}".
      Keep them under 15 words.
      Examples:
      - "{victim} dissolved in acid rain."
      - "{attacker} shattered {victim} with a sonic pulse."
      - "{victim} was deleted by the system."
      - "{attacker} routed high voltage through {victim}."
      Avoid robotic clichés. Focus on energy, neon, chaos, and fate.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        systemInstruction: "You are the announcer for a futuristic digital combat arena called RIVORA.",
      }
    });

    const jsonStr = response.text;
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return FALLBACK_ELIMINATIONS;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return FALLBACK_ELIMINATIONS;
  }
};

/**
 * Generates a cool arena name.
 */
export const generateArenaName = async (): Promise<string> => {
  if (!ai) return "Sector 7G Alpha";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a single cool, 2-3 word futuristic arena name (e.g. 'Neon Grave', 'Void Sector', 'Echo Chamber'). Return only the name.",
    });
    return response.text?.trim() || "Obsidian Core";
  } catch (e) {
    return "Obsidian Core";
  }
};