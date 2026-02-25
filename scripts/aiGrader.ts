import env from "dotenv";
env.config();

const systemPrompt = `You are a professional product authenticator. 
Analyze the provided list of products. Identify if they are REAL or "Hallucinations" (physically impossible or brand-mismatched).
Return a JSON object with a "results" key containing an array of objects:
{
  "results": [
    {
      "title": "string",
      "is_real": boolean,
      "grade": "NEW" | "USED" | "VINTAGE" | "FAKE",
      "score": number,
      "reasoning": "string"
    }
  ]
}`;

export async function gradeItemCondition(items: { title: string, id: string }[]) {
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY is missing!");
    return items.map(item => ({ ...item, is_real: true, error: true })); // Assume real if we can't check
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Grade these products: ${JSON.stringify(items.map(i => i.title))}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1 // Keep it deterministic
      })
    });

    const result = await response.json();

    if (result.error) {
        // If we hit a rate limit, return a "skip_check" signal rather than "is_real: false"
        console.error(`🚫 Groq API ${result.error.code}: ${result.error.message}`);
        return items.map(item => ({ title: item.title, is_real: true, error: true })); 
    }

    const parsed = JSON.parse(result.choices[0].message.content);
    return parsed.results;

  } catch (err: any) {
    console.error("🚨 AI Layer Crash:", err.message);
    // Safety fallback: Treat as real so we don't delete data during crashes
    return items.map(item => ({ title: item.title, is_real: true, error: true }));
  }
}