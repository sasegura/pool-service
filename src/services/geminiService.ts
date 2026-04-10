import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PoolLocation {
  id: string;
  name: string;
  address: string;
}

export async function optimizeRoute(pools: PoolLocation[]): Promise<string[]> {
  if (pools.length <= 1) return pools.map(p => p.id);

  const poolData = pools.map(p => ({ id: p.id, name: p.name, address: p.address }));
  
  const prompt = `
    Eres un experto en logística y optimización de rutas. 
    Tu tarea es reordenar la siguiente lista de piscinas para minimizar el tiempo de viaje total, siguiendo una ruta lógica (lineal o circular).
    
    Lista de piscinas:
    ${JSON.stringify(poolData, null, 2)}
    
    Devuelve ÚNICAMENTE un array de IDs en el orden optimizado.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const result = JSON.parse(response.text || "[]");
    
    // Validate that all returned IDs exist in the original list
    const validIds = result.filter((id: string) => pools.some(p => p.id === id));
    
    // If for some reason Gemini missed some IDs, append them at the end
    const missingIds = pools.filter(p => !validIds.includes(p.id)).map(p => p.id);
    
    return [...validIds, ...missingIds];
  } catch (error) {
    console.error("Error optimizing route with Gemini:", error);
    // Fallback to original order if AI fails
    return pools.map(p => p.id);
  }
}
