// pages/api/ai-scan.ts
import fetch from "node-fetch";

const OLLAMA_URL = "http://localhost:11434/api/generate";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body; // Base64 string from camera

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  // Ollama vision models (like llava) require raw base64 without the "data:image/jpeg;base64," prefix
  const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llava", // Use 'llava' for vision; 'mistral' is text-only
        prompt: "Identify this exact luxury item or electronic. Return ONLY the product name and model number. No prose, no conversation.",
        images: [cleanBase64],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);

    const data: any = await response.json();
    
    // Clean up the response to ensure it's just the product name
    const productName = data.response.trim();

    console.log(`📸 Vision Scan Result: ${productName}`);
    res.status(200).json({ productName });

  } catch (error) {
    console.error("🧠 Local Vision AI Error:", error);
    res.status(500).json({ error: "Local Vision AI Offline. Ensure 'ollama run llava' is active." });
  }
}
