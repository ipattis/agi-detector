import { PrismaClient } from '@prisma/client';
import { crawlUrl } from '../lib/crawler';

const prisma = new PrismaClient();

async function testCrawler() {
  try {
    // Delete existing test sources first
    await prisma.entry.deleteMany({
      where: {
        source: {
          url: {
            in: [
              'https://en.wikipedia.org/wiki/Artificial_general_intelligence',
              'https://openai.com/blog/planning-for-agi-and-beyond',
              'https://openai.com/research/gpt-4',
              'https://openai.com/blog/chatgpt'
            ]
          }
        }
      }
    });
    
    await prisma.source.deleteMany({
      where: {
        url: {
          in: [
            'https://en.wikipedia.org/wiki/Artificial_general_intelligence',
            'https://openai.com/blog/planning-for-agi-and-beyond',
            'https://openai.com/research/gpt-4',
            'https://openai.com/blog/chatgpt'
          ]
        }
      }
    });

    // Create test sources with different content structures
    const sources = await Promise.all([
      // Wikipedia article
      prisma.source.create({
        data: {
          url: 'https://en.wikipedia.org/wiki/Artificial_general_intelligence',
          contentHints: `
            title: h1#firstHeading
            content: #mw-content-text
          `,
          status: 'ACTIVE',
        },
      }),
      
      // OpenAI blog post about AGI
      prisma.source.create({
        data: {
          url: 'https://openai.com/blog/planning-for-agi-and-beyond',
          contentHints: `
            title: h1
            content: article
          `,
          status: 'ACTIVE',
        },
      }),

      // OpenAI research post about GPT-4
      prisma.source.create({
        data: {
          url: 'https://openai.com/research/gpt-4',
          contentHints: `
            title: h1
            content: article
          `,
          status: 'ACTIVE',
        },
      }),

      // OpenAI blog post about ChatGPT
      prisma.source.create({
        data: {
          url: 'https://openai.com/blog/chatgpt',
          contentHints: `
            title: h1
            content: article
          `,
          status: 'ACTIVE',
        },
      }),
    ]);

    console.log('Created test sources:', sources);

    // Try crawling each source
    for (const source of sources) {
      console.log(`\nCrawling ${source.url}...`);
      await crawlUrl(source.id);

      // Check the results
      const entry = await prisma.entry.findFirst({
        where: {
          sourceId: source.id,
        },
      });

      if (entry) {
        console.log('Successfully crawled. Content length:', entry.content.length);
        console.log('Title:', entry.title);
        console.log('First 200 characters:', entry.content.substring(0, 200));
      } else {
        console.log('No entry found for this source');
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCrawler();
