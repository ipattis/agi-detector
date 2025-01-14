const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getLatestCrawls() {
  try {
    const results = await prisma.crawlResult.findMany({
      take: 5,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        analysis: true
      }
    });
    
    console.log('Latest 5 crawl results:');
    results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log(`Title: ${result.title}`);
      console.log(`URL: ${result.url}`);
      console.log(`Timestamp: ${result.timestamp}`);
      if (result.analysis) {
        console.log(`Analysis Score: ${result.analysis.score}`);
        console.log(`Confidence: ${result.analysis.confidence}`);
        console.log(`Indicators: ${result.analysis.indicators.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getLatestCrawls();
