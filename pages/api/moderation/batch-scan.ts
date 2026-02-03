import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// 1. Setup Supabase (Admin Access)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. Setup OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security: Only allow POST requests (and ideally add an admin check here)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 3. Fetch 'pending' items in a batch (e.g., 50 at a time)
    // Adjust table name 'items' if yours is different (e.g., 'market_items')
    const { data: items, error: fetchError } = await supabase
      .from('items') 
      .select('id, name, description')
      .eq('status', 'pending') // Only grab unchecked items
      .limit(50);

    if (fetchError) throw fetchError;
    if (!items || items.length === 0) {
      return res.status(200).json({ message: 'No pending items to moderate.' });
    }

    // 4. Construct the Batch Prompt
    const itemData = items.map(item => ({
      id: item.id,
      text: `${item.name} - ${item.description || ''}`
    }));

    const prompt = `
      You are a strict content moderator for a marketplace. 
      Analyze the following list of items. 
      Identify items that are:
      - Gibberish / Random words (e.g. "asdfjkl")
      - Clearly fake or test data
      - Illegal or highly offensive
      - Not a real physical or digital good

      Return a JSON object with two arrays:
      - "approved_ids": [] (IDs of real, valid items)
      - "rejected_ids": [] (IDs of fake/bad items)

      Items to analyze:
      ${JSON.stringify(itemData)}
    `;

    // 5. Send to GPT-4o (or gpt-3.5-turbo for speed/cost)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Switch to "gpt-3.5-turbo-1106" to save money
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No response from AI");

    const result = JSON.parse(content);
    const { approved_ids, rejected_ids } = result;

    // 6. Bulk Update Supabase
    // We use Promise.all to do both updates in parallel
    await Promise.all([
      // Approve valid items
      approved_ids.length > 0 ? supabase
        .from('items')
        .update({ status: 'active', moderation_reason: null })
        .in('id', approved_ids) : Promise.resolve(),

      // Reject bad items
      rejected_ids.length > 0 ? supabase
        .from('items')
        .update({ status: 'rejected', moderation_reason: 'AI flagged as fake/spam' })
        .in('id', rejected_ids) : Promise.resolve()
    ]);

    return res.status(200).json({
      processed: items.length,
      approved: approved_ids.length,
      rejected: rejected_ids.length,
      rejected_ids // Useful for debugging
    });

  } catch (error: any) {
    console.error('Moderation Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
