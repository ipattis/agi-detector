import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentMetrics } from '@/lib/crawler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metrics = getCurrentMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
