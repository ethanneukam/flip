// scripts/billPromotions.ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-10-29.clover" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // billing window: previous day
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 1);

  // 1) Get active promotions
  const { data: promos } = await supabase.from("promotions").select("*").eq("status", "active");
  if (!promos) {
    console.log("No active promotions.");
    return;
  }

  for (const p of promos) {
    // Count clicks in window
    const { count } = await supabase
      .from("promotion_clicks")
      .select("id", { count: "exact", head: true })
      .eq("promotion_id", p.id)
      .gte("click_time", periodStart.toISOString())
      .lt("click_time", periodEnd.toISOString());

    const clicksCount = count || 0;
    if (clicksCount === 0) continue;

    const amountDue = Number((clicksCount * Number(p.cpc)).toFixed(2));

    // Insert bill record
    const { data: billRec } = await supabase.from("promotion_bills").insert([{
      promotion_id: p.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      clicks_count: clicksCount,
      amount_due: amountDue,
      status: "pending",
    }]).select().single();

    // Charge via Stripe
    // profiles must have stripe_customer_id stored; otherwise mark failed
    const { data: sellerRow } = await supabase.from("profiles").select("stripe_customer_id").eq("id", p.seller_id).single();

    if (!sellerRow?.stripe_customer_id) {
      console.warn(`No Stripe customer for seller ${p.seller_id} - marking bill failed`);
      await supabase.from("promotion_bills").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", billRec.id);
      continue;
    }

    try {
      // Create invoice item
      await stripe.invoiceItems.create({
        customer: sellerRow.stripe_customer_id,
        unit_amount: Math.round(amountDue * 100),
        currency: "usd",
        description: `Promoted listing ${p.item_id} clicks (${clicksCount}) @ $${p.cpc}`,
      });

      // Create & finalize invoice (auto charge)
      const invoice = await stripe.invoices.create({
        customer: sellerRow.stripe_customer_id,
        collection_method: "charge_automatically",
        auto_advance: true,
        metadata: {
          promotion_id: p.id,
          promotion_bill_id: billRec.id,
        },
      });

      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

      await supabase.from("promotion_bills").update({
        stripe_invoice_id: finalized.id,
        status: finalized.status === "paid" ? "paid" : "invoiced",
        updated_at: new Date().toISOString(),
      }).eq("id", billRec.id);

      // update promotion spent and check budget
      const newSpent = Number((Number(p.spent ?? 0) + amountDue).toFixed(2));
      const updatePayload: any = { spent: newSpent, updated_at: new Date().toISOString() };
      if (p.budget && newSpent >= Number(p.budget)) {
        updatePayload.status = "paused";
      }
      await supabase.from("promotions").update(updatePayload).eq("id", p.id);

      console.log(`Billed promotion ${p.id} for $${amountDue} (${clicksCount} clicks). Invoice: ${finalized.id}`);
    } catch (err: any) {
      console.error("Stripe billing error:", err);
      await supabase.from("promotion_bills").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", billRec.id);
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
