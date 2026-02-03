import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Determine the path to your worker script
    const workerPath = path.resolve(process.cwd(), 'workers/scrapeWorker.ts');

    // Trigger the process using tsx (since you're in a dev/codespace environment)
    // We use 'spawn' and 'unref' so the API returns immediately while the scraper runs
    const child = spawn('npx', ['tsx', workerPath], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env }
    });

    child.unref();

    console.log("🚀 Oracle manually triggered from Admin Dashboard.");
    return res.status(200).json({ message: "Scraper process initiated in background." });
  } catch (error: any) {
    console.error("Trigger Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
