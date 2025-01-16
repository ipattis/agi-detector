import { PrismaClient } from '@prisma/client';
import { crawlUrl, crawlAllActiveSources } from '../lib/crawler';

const prisma = new PrismaClient();

async function initializeCrawler() {
  try {
    console.log('Starting crawler worker...');
    
    // Start crawling all active sources
    await crawlAllActiveSources();
    
    // Set up interval to check for new sources every minute
    setInterval(async () => {
      const pendingSources = await prisma.source.findMany({
        where: {
          status: 'ACTIVE',
          crawlSchedule: null, // Only get sources without a schedule for immediate crawling
        },
      });
      
      for (const source of pendingSources) {
        await crawlUrl(source.id);
      }
    }, 60000);
    
    console.log('Crawler worker initialized successfully');
  } catch (error) {
    console.error('Error initializing crawler worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal. Shutting down crawler worker...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal. Shutting down crawler worker...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the worker
initializeCrawler();
