import { NextApiRequest, NextApiResponse } from 'next';
import { getNewArticles, getAllArticles } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { type = 'new', page = '1', pageSize = '20', orderBy = 'firstCaptured', order = 'desc' } = req.query;

    if (type === 'new') {
      const articles = await getNewArticles(20);
      return res.status(200).json({ articles });
    } else {
      const result = await getAllArticles(
        parseInt(page as string),
        parseInt(pageSize as string),
        orderBy as 'firstCaptured' | 'lastUpdated',
        order as 'asc' | 'desc'
      );
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ error: 'Failed to fetch articles' });
  }
}
