import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

// You need to set GOOGLE_APPLICATION_CREDENTIALS_JSON in your .env.local
// It should contain the entire JSON key from Google Cloud Console
const client = new ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'),
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageUrl, userId } = req.body;

  try {
    // 1. Detect Labels (What is this object?)
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }],
    });

    const labels = result.labelAnnotations || [];
    const texts = result.textAnnotations || [];
    
    // Get the top 3 confident labels
    const searchTerms = [
      texts[0]?.description, 
      labels[0]?.description, 
      labels[1]?.description
    ].filter(Boolean).join(" ");

    // 2. Search Supabase for a matching item
    // We use a broader search here since computer vision isn't perfect
    const { data: matchedItem } = await supabase
      .from('items')
      .select('*')
      .textSearch('title', searchTerms, { type: 'websearch', config: 'english' })
      .limit(1)
      .maybeSingle();

    if (!matchedItem) {
      // If we don't find it, we return the labels so the Frontend can ask the user to confirm
      return res.status(200).json({ 
        found: false, 
        suggestedTitle: labels[0]?.description || "Unknown Item" 
      });
    }

    // 3. Add to Vault
    const { data: asset } = await supabase
      .from('user_assets')
      .insert({
        user_id: userId,
        item_id: matchedItem.id,
        sku: matchedItem.ticker,
        status: 'IDENTIFIED',
        acquired_at: new Date().toISOString()
      })
      .select()
      .single();

    return res.status(200).json({ found: true, item: matchedItem, asset });

  } catch (err: any) {
    console.error("Vision API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
