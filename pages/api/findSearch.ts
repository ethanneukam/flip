// pages/api/findSearch.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";
import OpenAI from "openai";

// Optional AI search — only if API key exists
const hasAI = !!process.env.OPENAI_API_KEY;
const client = hasAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    // If AI is disabled or quota exceeded, fallback to Supabase search
    if (!hasAI) {
      console.log("🧭 Fallback: AI disabled, using Supabase search only.");
      return await basicSupabaseSearch(query, res);
    }

    try {
      // 🔍 Step 1: AI Search
      const prompt = `Search marketplace listings for the query: "${query}". Return relevant keywords.`;
      const aiResponse = await client!.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
      });

      // --- FIX: Extract message text safely ---
      let refinedQuery = query;
      const first = aiResponse.output?.[0];

      if (first && first.type === "message") {
        const msg = first.message;
        if (msg?.content) {
          const textBlock = msg.content.find((c) => c.type === "output_text");
          if (textBlock && "text" in textBlock) {
            refinedQuery = textBlock.text;
          }
        }
      }
      // ---------------------------------------

      // 🔎 Step 2: Query Supabase with refined query
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .textSearch("title", refinedQuery)
        .limit(50);

      if (error) throw error;

      return res.status(200).json({ data });
    } catch (aiError: any) {
      console.warn("⚠️ AI Search failed, using fallback:", aiError.message);
      return await basicSupabaseSearch(query, res);
    }
  } catch (err: any) {
    console.error("🔥 Search API error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// 🧱 Basic Supabase fallback
async function basicSupabaseSearch(query: string, res: NextApiResponse) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(50);

  if (error) {
    console.error("Supabase search error:", error.message);
    return res.status(500).json({ error: "Search failed" });
  }

  return res.status(200).json({ data });
}
