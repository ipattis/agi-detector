import { NextApiRequest, NextApiResponse } from 'next';
import { startCrawl, scheduleCrawl, analyzeCrawlData } from '@/lib/crawler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, schedule } = req.body;

    switch (action) {
      case 'start': {
        const result = await startCrawl();
        if (!result.success) {
          return res.status(409).json({ 
            error: result.error,
            metrics: result.metrics
          });
        }
        return res.status(200).json({ 
          success: true, 
          message: 'Crawl completed successfully',
          articles: result.articles,
          metrics: result.metrics
        });
      }

      case 'schedule':
        if (!schedule) {
          return res.status(400).json({ error: 'Schedule parameter is required' });
        }
        await scheduleCrawl(schedule);
        return res.status(200).json({ success: true, message: 'Crawl scheduled successfully' });

      case 'analyze':
        await analyzeCrawlData();
        return res.status(200).json({ success: true, message: 'Analysis completed successfully' });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in crawl API:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      metrics: null
    });
  }
}
