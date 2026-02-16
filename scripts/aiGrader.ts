// scripts/aiGrader.ts
import env from "dotenv";
env.config();

// Example using Groq (Fast & Free tier available) or OpenAI
export async function gradeItemCondition(title: string) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Or gpt-4o-mini
        messages: [
          {
            role: "system",
            content: "You are a product authenticator. Your job is to determine if a product is a real, existing consumer good. If the product is fake (e.g., 'Dyson Sneakers'), mark it as 'FAKE'. If real, provide a market value grade."
          },
          {
            role: "user",
            content: `Analyze this asset: "${title}"`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    console.error("AI Layer Offline:", err.message);
    return { status: "unknown" };
  }
}
