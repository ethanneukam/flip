// scripts/aiGrader.ts
import env from "dotenv";
env.config();

// Example using Groq (Fast & Free tier available) or OpenAI
export async function gradeItemCondition(title: string) {
 try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { // Or OpenAI
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3-70b-8192", // High reasoning model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Asset to Authenticate: "${title}"` }
        ],
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    const data = JSON.parse(result.choices[0].message.content);

    if (!data.is_real) {
      console.log(`🚫 FAKE DETECTED: ${title} - ${data.reasoning}`);
      // Logic to discard or mark as 'Hallucination' in your DB
    }

    return data;
  } catch (err) {
    console.error("AI Layer connection failed. Ensure AI_API_KEY is set in Render.");
    return { is_real: false, confidence: 0 };
  }
}
