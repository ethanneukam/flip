import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { email, ref } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  // Generate unique referral code
  const referralCode = nanoid(8);

  // Save to Supabase
  const { error } = await supabase
    .from("waitlist")
    .upsert(
      [{ email, referral_code: referralCode, referred_by: ref || null }],
      { onConflict: "email" }
    );

  if (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Database error" });
  }

  return res.status(200).json({ referralCode });
}