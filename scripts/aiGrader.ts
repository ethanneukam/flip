import fetch from "node-fetch";

const OLLAMA_URL = "http://localhost:11434/api/generate";

interface GradingResult {
  grade: string;
  score: number;
  notes: string;
}

export async function gradeItemCondition(title: string, description: string = ""): Promise<GradingResult> {
  const prompt = `
    You are an expert appraiser for an asset exchange. 
    Analyze the following product text. 
    Look for keywords indicating damage (scratches, cracks, dents, used) vs value (sealed, new, mint, pro).
    
    Product: "${title} ${description}"
    
    Return ONLY a JSON object. No markdown. No other text. Format:
    {
      "grade": "String (A=Mint/Sealed, B=Good, C=Fair/Used, F=Damaged)",
      "score": Number (0.0 to 1.0),
      "notes": "Short reason for grade (max 5 words)"
    }
  `;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral", // Change this to "tinyllama" if you downloaded that instead
        prompt: prompt,
        stream: false,
        format: "json" 
      }),
    });

    const data: any = await response.json();
    const result = JSON.parse(data.response);
    
    return {
      grade: result.grade || "C",
      score: typeof result.score === 'number' ? result.score : 0.5,
      notes: result.notes || "Analyzed"
    };
  } catch (error) {
    console.error("🧠 AI Error:", error);
    return { grade: "NR", score: 0.5, notes: "AI Offline" };
  }
}
