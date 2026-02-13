import { createServer } from 'node:http';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const port = process.env.PORT || 3000;

// 1. THE SERVER RESPONDS INSTANTLY
const server = createServer((req, res) => {
    console.log("📥 Cron job hit received!");
    res.writeHead(200, { 
        'Content-Type': 'text/plain',
        'Content-Length': 2 
    });
    res.end('OK'); // Strictly 2 characters to keep cron-job.org happy
});

server.listen(port, () => {
    console.log(`✅ Health check server live on port ${port}`);
    
    // 2. DELAY THE SCRAPER
    // This gives the server time to finish the HTTP response 
    // before the CPU gets pegged by the scraper.
    setTimeout(launchScraper, 1000);
});

async function launchScraper() {
    try {
        console.log("📝 Loading Scraper Config...");
        // Pointing specifically to our new scraper-only tsconfig
        register("ts-node/esm", {
            parentURL: pathToFileURL("./"),
            project: "./tsconfig.scraper.json" 
        });

        console.log("🚀 Scraper internal launch sequence initiated...");
        await import('./scripts/scrapeRunner.ts'); 
    } catch (e) {
        console.error("❌ SCRAPER ERROR:", e.message);
    }
}

// Keep the process alive even if the scraper hits a snag
process.on('uncaughtException', (err) => console.error("⚠️ Caught Exception:", err.message));
process.on('unhandledRejection', (reason) => console.error("⚠️ Caught Rejection:", reason));
