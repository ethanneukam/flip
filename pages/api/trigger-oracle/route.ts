import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST() {
  try {
    // Determine the path to your script
    const scriptPath = path.resolve(process.cwd(), "scripts/scrapeRunner.ts");

    console.log(`🚀 Manual Override: Starting Oracle at ${scriptPath}`);

    // Spawn the process
    // 'npx tsx' allows us to run TypeScript files directly in production/dev
    const process = spawn("npx", ["tsx", scriptPath], {
      detached: true,
      stdio: "ignore", // We let it run in the background
    });

    // Unref allows the parent (this API) to exit while the child continues
    process.unref();

    return NextResponse.json({ 
      success: true, 
      message: "Oracle process spawned in background." 
    });
  } catch (error: any) {
    console.error("❌ Failed to trigger Oracle:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
