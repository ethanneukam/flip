// scripts/aiGrader.ts
import env from "dotenv";
env.config();

const systemPrompt = `You are a professional product authenticator. 
Your job is to identify if a product is REAL or a "Hallucination" (a physically impossible product).
Examples of Hallucinations: "DeWalt GPU", "Canon Camping Tent", "Lego Headphones".
You must return a JSON object with:
{
  "is_real": boolean,
  "grade": "NEW" | "USED" | "VINTAGE" | "FAKE",
  "score": number (0-100),
  "notes": "Brief explanation",
  "reasoning": "Why you think it is real or fake"
}`;

export async function gradeItemCondition(title: string, condition: string = "") {
  // Debug: Ensure the key is actually being read by the process
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY is missing from process.env!");
    return { is_real: false, grade: "FAKE", score: 0, notes: "No API Key" };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Asset: "${title}". Reported Condition: "${condition}"` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    
    // Check if Groq returned an error (like 401 Unauthorized)
    if (result.error) {
       console.error("🚫 Groq API Error:", result.error.message);
       return { is_real: false, grade: "FAKE", score: 0, notes: "API Error" };
    }

    const data = JSON.parse(result.choices[0].message.content);

    if (!data.is_real) {
      console.log(`🚫 HALLUCINATION FILTERED: ${title} (${data.reasoning})`);
    }

    return data;
  } catch (err: any) {
    // This now logs the REAL error (e.g., "systemPrompt is not defined")
    console.error("🚨 AI Layer Crash:", err.message);
    return { is_real: false, grade: "FAKE", score: 0, notes: "System Crash", confidence: 0 };
  }
}
