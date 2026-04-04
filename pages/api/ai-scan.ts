import fetch from "node-fetch";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body; // Base64 string from camera (e.g., data:image/jpeg;base64,...)

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // llama-3.2-11b-vision-preview is the current sweet spot for speed/accuracy
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify this item (food, electronic, vehicle, luxury good, etc.). Return ONLY the specific product name and model number. No conversational filler.",
              },
              {
                type: "image_url",
                image_url: {
                  url: image, // Groq likes the full data URI (including the prefix)
                },
              },
            ],
          },
        ],
        temperature: 0.1, // Low temperature for high accuracy/consistency
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq Error: ${JSON.stringify(errorData)}`);
    }

    const data: any = await response.json();
    
    // Groq follows the OpenAI response format
    const productName = data.choices[0]?.message?.content?.trim() || "Unknown Item";

    console.log(`📸 Universal Vision Result: ${productName}`);
    res.status(200).json({ productName });

  } catch (error) {
    console.error("🧠 Groq Vision AI Error:", error);
    res.status(500).json({ 
      error: "Vision scan failed.", 
      details: error.message 
    });
  }
}
