import { ImageAnnotatorClient } from '@google-cloud/vision';

// 1. SAFE BOOT: Prevent Vercel from crashing if the JSON is malformed
let credentials = {};
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } else {
    console.warn("SYSTEM.WARN: Google Vision Credentials missing.");
  }
} catch (error) {
  console.error("SYSTEM.CRITICAL: Failed to parse Google Vision JSON.");
}

const client = new ImageAnnotatorClient({ credentials });

/**
 * Condition Scoring Logic
 * Scans labels AND text for negative keywords to calculate a value multiplier.
 */
function calculateConditionScore(labels: any[], text: string) {
  const wearKeywords = ['scratch', 'stain', 'tear', 'damage', 'used', 'worn', 'dirty', 'refurbished', 'scuff'];
  let penalty = 0;

  // Check labels
  labels.forEach(l => {
    const description = l.description?.toLowerCase() || "";
    if (wearKeywords.some(keyword => description.includes(keyword))) {
      penalty += 0.15; // 15% drop per negative trait found
    }
  });

  // Check extracted text (sometimes damage is printed on a sticker)
  const lowerText = text.toLowerCase();
  if (wearKeywords.some(keyword => lowerText.includes(keyword))) {
    penalty += 0.10; 
  }

  // Never drop below 50% value (0.5)
  return Math.max(1 - penalty, 0.5);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "MISSING_PAYLOAD :: Image URL is required" });
    }

    // 2. Ping Google Vision API
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }],
    });

    const labels = result.labelAnnotations || [];
    const text = result.textAnnotations?.[0]?.description || "";

    // 3. SKU Extraction Logic (Regex for model numbers/serial codes)
    const skuMatch = text.match(/[A-Z0-9-]{5,15}/g); 

    // 4. Calculate Oracle Condition Score
    const score = calculateConditionScore(labels, text);

    // 5. Return the Terminal Analysis
    res.status(200).json({
      suggestion: labels[0]?.description || "UNKNOWN_ASSET",
      detectedText: text,
      probableSku: skuMatch ? skuMatch[0] : null,
      conditionScore: score,
      labels: labels.slice(0, 5).map(l => l.description) 
    });

  } catch (error: any) {
    console.error("VISION_API_ERR:", error);
    res.status(500).json({ error: "ANALYSIS_FAILED", details: error.message });
  }
}