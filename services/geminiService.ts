import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize Gemini Client", e);
  }
}

// Generate battle narrative for elimination
export async function generateBattleNarrative(
  victimName: string,
  attackerName: string,
  stage: 'OPENING' | 'MID_BATTLE' | 'FINAL_SHOWDOWN'
): Promise<string | null> {
  if (!ai) return null;

  const stageDescription = {
    OPENING: 'early chaos of the battle',
    MID_BATTLE: 'intense mid-game conflict',
    FINAL_SHOWDOWN: 'dramatic final showdown with high tension'
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single dramatic, intense battle royale elimination narrative.
      
      Victim: ${victimName}
      ${attackerName !== 'THE ARENA' ? `Attacker: ${attackerName}` : 'Eliminated by arena hazard'}
      Stage: ${stageDescription[stage]}
      
      Requirements:
      - Maximum 20 words
      - Intense and dramatic tone
      - Use vivid action words
      - Make it feel like an epic moment
      - NO emojis
      
      Return only the narrative text, nothing else.`,
      config: {
        systemInstruction: "You are the dramatic announcer for RIVORA, an intense battle royale giveaway arena. Your narratives are legendary and make every elimination feel epic.",
      }
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

// Generate revival narrative
export async function generateRevivalNarrative(playerName: string): Promise<string | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single dramatic revival narrative for a battle royale game.
      
      Revived Player: ${playerName}
      
      Requirements:
      - Maximum 15 words
      - Miraculous and surprising tone
      - Make it feel like an impossible comeback
      - NO emojis
      
      Return only the narrative text, nothing else.`,
      config: {
        systemInstruction: "You are the dramatic announcer for RIVORA, an intense battle royale giveaway arena.",
      }
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

// Generate victory narrative
export async function generateVictoryNarrative(winnerName: string): Promise<string | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single epic victory announcement for a battle royale champion.
      
      Champion: ${winnerName}
      
      Requirements:
      - Maximum 25 words
      - Triumphant and legendary tone
      - Celebrate the victory dramatically
      - Mention they've won the prize
      - NO emojis
      
      Return only the announcement text, nothing else.`,
      config: {
        systemInstruction: "You are the legendary announcer for RIVORA, crowning the ultimate champion.",
      }
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

// Generate room name
export async function generateArenaName(): Promise<string> {
  if (!ai) return "Neon Arena";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a single cool, 2-3 word futuristic arena name (e.g. 'Neon Grave', 'Void Sector', 'Echo Chamber', 'Shadow Forge'). Return only the name.",
    });
    return response.text?.trim() || "Obsidian Core";
  } catch (e) {
    return "Obsidian Core";
  }
}

// Generate batch of elimination narratives for pre-loading
export async function fetchEliminationNarratives(count: number = 10): Promise<string[]> {
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate ${count} short, intense, dramatic elimination descriptions for a battle royale log.
      Use the placeholders "{victim}" and optionally "{attacker}".
      Keep them under 20 words each.
      Make them varied - some with attackers, some with arena hazards.
      Focus on energy, intensity, and drama.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        },
        systemInstruction: "You are the announcer for RIVORA, a futuristic digital combat arena. Your narratives are legendary.",
      }
    });

    const jsonStr = response.text;
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
}
