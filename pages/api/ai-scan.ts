import fetch from "node-fetch";
import { createClient } from '@supabase/supabase-js';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- SESSION VERIFICATION ---
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // --- SCAN LIMIT ENFORCEMENT (server-side) ---
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('daily_scan_count, scan_limit, is_pro')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return res.status(500).json({ error: 'Failed to fetch user data' });
  }

  const effectiveLimit = userData.is_pro ? 999 : userData.scan_limit;

  if (userData.daily_scan_count >= effectiveLimit) {
    return res.status(429).json({
      error: 'SCAN_LIMIT_REACHED',
      limit: effectiveLimit,
      isPro: userData.is_pro,
    });
  }

  // --- INCREMENT SCAN COUNT (before AI call — prevents race condition) ---
  await supabase
    .from('users')
    .update({ daily_scan_count: userData.daily_scan_count + 1 })
    .eq('id', user.id);

  // --- IMAGE VALIDATION ---
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    // --- GROQ VISION CALL (unchanged) ---
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", 
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
                  url: image,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq Error: ${JSON.stringify(errorData)}`);
    }

    const data: any = await response.json();
    
    const productName = data.choices[0]?.message?.content?.trim() || "Unknown Item";

    console.log(`📸 Universal Vision Result: ${productName}`);

    // --- WRITE TO flip_items (new — enables trigger pipeline) ---
    const { data: flipItem, error: insertError } = await supabase
      .from('flip_items')
      .insert({
        user_id: user.id,
        title: productName,
        description: '',
        category: 'other',
        condition: 'good',
        ai_confidence: 75,
        image_urls: [],
        status: 'draft',
      })
      .select('id')
      .single();

    if (insertError || !flipItem) {
      console.error("flip_items insert error:", insertError);
      return res.status(500).json({
        error: 'Failed to create flip item',
        productName,
        details: insertError?.message,
      });
    }

    // --- RETURN flipItemId + productName ---
    res.status(200).json({ flipItemId: flipItem.id, productName });

  } catch (error) {
    console.error("🧠 Groq Vision AI Error:", error);
    res.status(500).json({ 
      error: "Vision scan failed.", 
      details: error.message 
    });
  }
}
