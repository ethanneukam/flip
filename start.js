// start.js - KEEPS RENDER ALIVE
import { createServer } from 'node:http';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

console.log("⚠️ STARTING LAUNCHER WITH SERVER ⚠️");

// 1. START A DUMMY WEB SERVER (Satisfies Render)
const port = process.env.PORT || 3000;
const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Scraper is running in the background.');
});

server.listen(port, () => {
    console.log(`✅ HTTP Server listening on port ${port} (Keeps Render alive)`);
});

// 2. ERROR HANDLERS (Keep these to catch crashes)
process.on('uncaughtException', (err) => {
    console.error("💀 UNCAUGHT EXCEPTION:", err);
    // Don't exit immediately, let the server keep running if possible
});

process.on('unhandledRejection', (reason) => {
    console.error("🔴 UNHANDLED REJECTION:", reason);
});

// 3. LAUNCH YOUR SCRAPER
try {
    console.log("📝 Registering TypeScript loader...");
    register("ts-node/esm", pathToFileURL("./"));
    
    console.log("🚀 Launching scrapeRunner.ts...");
    // We don't await this because we want the server to run in parallel
    import('./scripts/scrapeRunner.ts'); 
    
} catch (e) {
    console.error("❌ FAILED TO LOAD SCRIPT:", e);
}
