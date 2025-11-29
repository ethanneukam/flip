import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { user_id, amount, reason, related_id } = await req.json();

  if (!user_id || !amount)
    return NextResponse.json({ error: "Missing params" }, { status: 400 });

  // Insert transaction record
  await supabase.from("flip_coins").insert([
    {
      user_id,
      amount,
      reason,
      related_id,
    },
  ]);

  // Update profile balance
  await supabase.rpc("increment_coins_balance", {
    user_id_input: user_id,
    amount_input: amount,
  });

  return NextResponse.json({ success: true });
}
