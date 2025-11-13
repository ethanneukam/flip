import cron from 'node-cron';
import { scrapeAll } from './universalScraper';

// Schedule: run every 3 hours
cron.schedule('0 */3 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled scraping...`);
  try {
    await scrapeAll({ updateExisting: true });
    console.log(`[${new Date().toISOString()}] Scraping finished.`);
  } catch (err) {
    console.error('Error during scheduled scraping:', err);
  }
});