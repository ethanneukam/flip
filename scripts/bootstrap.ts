// scripts/bootstrap.ts

// 1. Register the safety net IMMEDIATELY
process.on('unhandledRejection', (reason: any) => {
  console.error("\n\n🚨 CRITICAL STARTUP CRASH 🚨");
  console.error("---------------------------------------------------");
  if (reason instanceof Error) {
    console.error("Error Message:", reason.message);
    console.error("Stack Trace:", reason.stack);
  } else {
    // This catches the [object Object] error
    console.error("Raw Error Object:", JSON.stringify(reason, null, 2));
  }
  console.error("---------------------------------------------------\n\n");
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error("\n\n🚨 UNCAUGHT EXCEPTION 🚨");
  console.error(error);
  process.exit(1);
});

console.log("✅ Bootstrap active. Loading scraper...");

// 2. Dynamic import ensures the handler is ready before the app loads
import('./scrapeRunner.js').catch(err => {
    console.error("Failed to import scrapeRunner:", err);
});x`az
