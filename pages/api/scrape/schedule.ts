// app/api/scrape/schedule/route.ts
import { NextResponse } from "next/server";
import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

const scrapeQueue = new Queue("scrape-jobs", { connection });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_id, keyword } = body;

    if (!item_id || !keyword) {
      return NextResponse.json(
        { error: "item_id and keyword are required" },
        { status: 400 }
      );
    }

    // Add scrape job
    await scrapeQueue.add(
      "scrape-item",
      { item_id, keyword },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return NextResponse.json({ status: "scheduled", item_id, keyword });
  } catch (err: any) {
    console.error("Schedule error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}