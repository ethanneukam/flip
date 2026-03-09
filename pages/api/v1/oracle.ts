import { NextApiRequest, NextApiResponse } from 'next';
import { verifyApiKey } from '../../../lib/api-auth';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Authenticate the Developer Key
  const apiKey = req.headers['x-api-key'] as string;
  const userId = await verifyApiKey(apiKey);

  if (!userId) {
    return res.status(401).json({ error: "UNAUTHORIZED: Invalid API key." });
  }

  const { ticker } = req.query; // e.g., /api/v1/oracle?ticker=ROLEX-126610

  if (!ticker) {
    return res.status(400).json({ error: "BAD_REQUEST: Ticker symbol is required." });
  }

  // 2. Query the 'price_logs' table for the latest entry
  const { data, error } = await supabase
    .from('price_logs')
    .select('price, created_at, source, confidence_score')
    .eq('ticker_symbol', ticker)
    .order('created_at', { ascending: false }) // Get the most recent log
    .limit(1)
    .single();

  if (error || !data) {
    return res.status(404).json({ 
      error: "DATA_NOT_FOUND", 
      message: `No price logs found for ticker: ${ticker}` 
    });
  }

  // 3. Return the payload
  return res.status(200).json({
    ticker: ticker,
    price: data.price,
    timestamp: data.created_at,
    meta: {
      source: data.source || 'Oracle_Mainnet',
      confidence: data.confidence_score || 0.95
    }
  });
}