// pages/api/scan.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';

const client = new ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
});

export default async function handler(req, res) {
  const { imageUrl } = req.body;

  // 1. Google Vision Label & Text Detection
  const [result] = await client.annotateImage({
    image: { source: { imageUri: imageUrl } },
    features: [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }],
  });

  const labels = result.labelAnnotations || [];
  const text = result.textAnnotations?.[0]?.description || "";

  // 2. Logic to "Guess" the SKU from text or labels
  // This is a simple version: searching for model numbers in the text
  const skuMatch = text.match(/[A-Z0-9-]{5,15}/g); 

  res.status(200).json({
    suggestion: labels[0]?.description, // e.g., "Sneaker"
    detectedText: text,
    probableSku: skuMatch ? skuMatch[0] : null
  });
}
