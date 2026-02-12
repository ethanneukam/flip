// start.js
console.log("⚠️ STARTING DIAGNOSTIC LAUNCHER ⚠️");

// 1. PRE-FLIGHT CHECK (Most crashes happen here)
// These keys are required for Supabase/DB clients to initialize.
// If they are missing, the app crashes instantly with [object Object].
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredVars.filter(key => !process.env[key]);

if (missing.length > 0) {
    console.error("\n❌ CRITICAL ERROR: MISSING ENV VARS ❌");
    console.error("The app cannot start because these variables are not set in Render:");
    console.error(JSON.stringify(missing, null, 2));
    console.error("Go to Render Dashboard -> Environment and add them immediately.\n");
    process.exit(1);
}

// 2. REGISTER ERROR TRAP
process.on('unhandledRejection', (reason) => {
    console.error("\n🔴 FATAL ERROR CAUGHT 🔴");
    console.error("This error happened inside one of your imports:");
    console.error("------------------------------------------------");
    // This forces the hidden [object Object] to print its contents
    if (typeof reason === 'object') {
        try {
            console.error(JSON.stringify(reason, null, 2));
        } catch (e) {
            console.error(reason);
        }
    } else {
        console.error(reason);
    }
    console.error("------------------------------------------------\n");
    process.exit(1);
});

// 3. LAUNCH APP
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

console.log("✅ Env vars present. Registering TypeScript loader...");

try {
    // Manually register ts-node so we can run the TS file
    register("ts-node/esm", pathToFileURL("./"));
    
    // Dynamically import the scraper so the error trap above is active during load
    console.log("🚀 Loading scraper...");
    await import('./scripts/scrapeRunner.ts');
} catch (e) {
    console.error("❌ LAUNCH FAILED ❌");
    console.error(e);
}
