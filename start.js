import { createServer } from 'node:http';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const port = process.env.PORT || 3000;

// 1. THE WEB SERVER (Keeps Render Happy)
const server = createServer((req, res) => {
    console.log("📥 Ping received");
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

server.listen(port, () => {
    console.log(`✅ Server live on port ${port}`);
    
    // 2. LAUNCH THE SCRAPER
    setTimeout(launchScraper, 2000);
});

async function launchScraper() {
    try {
        console.log("📝 Registering Environment...");
        
        // Use the scraper-specific config we made earlier
        register("ts-node/esm", {
            parentURL: pathToFileURL("./"),
            project: "./tsconfig.scraper.json" 
        });

        console.log("🚀 Importing Scraper Logic...");
        
        // DYNAMIC IMPORT + EXECUTION
        const scraperModule = await import('./scripts/scrapeRunner.ts');
        
        // EXECUTE THE LOOP
        if (scraperModule.startScraperLoop) {
            console.log("🟢 Triggering Infinite Loop...");
            scraperModule.startScraperLoop();
        } else {
            console.error("❌ ERROR: startScraperLoop not found in scrapeRunner.ts");
        }
        
    } catch (e) {
        console.error("❌ BOOT FAILED:", e);
    }
}
