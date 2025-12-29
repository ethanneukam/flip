// pages/api/scan.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';

const client = new ImageAnnotatorClient({
  // Use the JSON environment variable we discussed earlier
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'),
});

/**
 * Day 26: Condition Scoring Logic
 * Scans labels for negative keywords to calculate a value multiplier.
 */
function calculateConditionScore(labels: any[]) {
  const wearKeywords = ['scratch', 'stain', 'tear', 'damage', 'used', 'worn', 'dirty'];
  let penalty = 0;

  labels.forEach(l => {
    const description = l.description?.toLowerCase() || "";
    if (wearKeywords.some(keyword => description.includes(keyword))) {
      penalty += 0.15; // 15% drop per negative trait found
    }
  });

  // Never drop below 50% value (0.5)
  return Math.max(1 - penalty, 0.5);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // 1. Google Vision Label & Text Detection
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }],
    });

    const labels = result.labelAnnotations || [];
    const text = result.textAnnotations?.[0]?.description || "";

    // 2. SKU Matching Logic (Regex for model numbers/serial codes)
    const skuMatch = text.match(/[A-Z0-9-]{5,15}/g); 

    // 3. Calculate Condition Score (Day 26)
    const score = calculateConditionScore(labels);

    // 4. Return the complete Oracle Analysis
    res.status(200).json({
      suggestion: labels[0]?.description || "Unknown Asset",
      detectedText: text,
      probableSku: skuMatch ? skuMatch[0] : null,
      conditionScore: score,
      labels: labels.slice(0, 5).map(l => l.description) // Send top 5 labels for UI debug
    });

  } catch (error: any) {
    console.error("Vision API Error:", error);
    res.status(500).json({ error: "Analysis failed", details: error.message });
  }
}
