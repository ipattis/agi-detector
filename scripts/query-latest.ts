import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const results = await prisma.crawlResult.findMany({
      take: 5,
      orderBy: {
        firstCaptured: 'desc',
      },
      include: {
        analysis: true,
      },
    });

    console.log('Latest 5 crawl results:');
    results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log(`Title: ${result.title}`);
      console.log(`URL: ${result.url}`);
      console.log(`First Captured: ${result.firstCaptured}`);
      console.log(`Last Updated: ${result.lastUpdated}`);
      console.log(`Source: ${result.source}`);
      console.log(`Is New: ${result.isNew}`);
      
      if (result.analysis) {
        console.log(`Analysis Score: ${result.analysis.score}`);
        console.log(`Confidence: ${result.analysis.confidence}`);
        console.log(`Indicators: ${result.analysis.indicators.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
