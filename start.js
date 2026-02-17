import { createServer } from 'node:http';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Render prefers 10000, fallback to 3000 for local dev
const port = process.env.PORT || 10000;

// 1. THE WEB SERVER (Satisfies Render's Health Check)
const server = createServer((req, res) => {
    // Basic health check endpoint
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('ALIVE');
        return;
    }
    
    console.log(`📥 Ping received: ${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ORACLE_ONLINE');
});

// CRITICAL: Explicitly bind to '0.0.0.0' for Render
server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server live on port ${port} (Bound to 0.0.0.0)`);
    
    // 2. LAUNCH THE SCRAPER
    // We start this after the server is up so the health check passes immediately
    launchScraper();
});

async function launchScraper() {
    try {
        console.log("📝 Registering TypeScript Loader...");
        
        register("ts-node/esm", {
            parentURL: pathToFileURL("./"),
            project: "./tsconfig.scraper.json" 
        });

        console.log("🚀 Importing Scraper Logic...");
        
        // Use a cache-busting timestamp if you ever need to hot-reload
        const scraperModule = await import(`./scripts/scrapeRunner.ts?update=${Date.now()}`);
        
        if (scraperModule.startScraperLoop) {
            console.log("🟢 Oracle Loop Triggered.");
            // We don't 'await' this because it's an infinite loop
            scraperModule.startScraperLoop().catch(err => {
                console.error("🚨 FATAL LOOP ERROR:", err);
            });
        } else {
            console.error("❌ ERROR: startScraperLoop export missing.");
        }
        
    } catch (e) {
        console.error("❌ BOOT FAILED:", e);
        // On a boot failure, we keep the HTTP server alive so you can check logs 
        // without Render constanty rebooting the container
    }
}

// Handle unexpected kills
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close();
    process.exit(0);
});
