// pages/api/cron/scrape-all.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // This triggers a GitHub Action repository dispatch event
  const response = await fetch(`https://api.github.com/repos/${process.env.GH_OWNER}/${process.env.GH_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GH_PAT}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ event_type: 'start_scrape' }),
  });

  if (response.ok) {
    return res.status(200).json({ message: 'GitHub Scraper Triggered' });
  } else {
    const err = await response.text();
    return res.status(500).json({ error: 'Failed to trigger GitHub', details: err });
  }
}