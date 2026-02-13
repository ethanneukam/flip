// start.js - OPTIMIZED FOR CRON JOBS
import { createServer } from 'node:http';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// 1. MINIMALIST SERVER (Returns strictly "OK" to satisfy cron-job.org)
const port = process.env.PORT || 3000;
const server = createServer((req, res) => {
    // Force a tiny response to prevent "Output too large"
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

server.listen(port, () => {
    console.log(`✅ HTTP Server listening on port ${port}`);

    // 2. THE TRICK: Wait 2 seconds before launching the scraper.
    // This gives the server time to "settle" and answer the health check immediately.
    setTimeout(() => {
        launchScraper();
    }, 2000);
});

async function launchScraper() {
    try {
        console.log("📝 Registering TypeScript loader...");
        // Only register if not already registered (prevents errors on re-runs)
        try { register("ts-node/esm", pathToFileURL("./")); } catch (e) {}

        console.log("🚀 Launching scraper in background...");
        // We import purely for side-effects (running the script)
        await import('./scripts/scrapeRunner.ts'); 
    } catch (e) {
        console.error("❌ SCRAPER ERROR:", e);
    }
}

// 3. SAFETY NETS (Keep the app alive if scraper crashes)
process.on('uncaughtException', (err) => {
    console.error("💀 SILENT CRASH CAUGHT:", err.message);
    // Do not exit. Let the server stay alive for Render.
});

process.on('unhandledRejection', (reason) => {
    console.error("🔴 PROMISE REJECTED:", reason);
});
