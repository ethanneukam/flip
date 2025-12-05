import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { listingId, imageUrl } = req.body;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Is this image NSFW? Answer with only: safe or nsfw." },
            { 
              type: "image_url", 
              image_url: { url: imageUrl } 
            }
          ]
        }
      ]
    });

    // 🔥 FIX: content can be a string OR an array
    const rawContent = response.choices[0].message.content;

    let text: string;

    if (Array.isArray(rawContent)) {
      const block = rawContent.find((b: any) => b.type === "text");
      text = block?.text?.toLowerCase() || "safe";
    } else {
      text = rawContent.toLowerCase();
    }

    const isNSFW = text.includes("nsfw");

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        moderationStatus: isNSFW ? "rejected" : "approved",
        moderationReason: isNSFW ? "NSFW content detected" : null,
        scannedAt: new Date(),
      },
    });

    return res.json({ ok: true, nsfw: isNSFW });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
