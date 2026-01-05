// pages/api/ai-scan.ts
export default async function handler(req, res) {
  const { image } = req.body; // Base64 string from camera

  // Call OpenAI Vision or Google Vision
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Identify this exact luxury item. Return ONLY the product name and model number. No prose." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }
        ]
      }]
    })
  });

  const aiResult = await response.json();
  const productName = aiResult.choices[0].message.content;

  res.status(200).json({ productName });
}