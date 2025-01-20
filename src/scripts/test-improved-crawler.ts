import { PrismaClient } from '@prisma/client'
import { crawlUrl } from '../lib/crawler'

const prisma = new PrismaClient()

async function testCrawler() {
  try {
    // Create a test source
    const source = await prisma.source.create({
      data: {
        url: 'https://openai.com/blog/gpt-4',
        status: 'ACTIVE'
      }
    })

    console.log('Created test source:', source)

    // Crawl the URL
    await crawlUrl(source.id)

    // Fetch and display the results
    const result = await prisma.source.findUnique({
      where: { id: source.id },
      include: {
        entries: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    console.log('\nCrawl Results:')
    console.log('Source Status:', result?.status)
    console.log('Last Error:', result?.lastError)
    
    if (result?.entries.length) {
      const entry = result.entries[0]
      console.log('\nEntry Details:')
      console.log('Title:', entry.title)
      console.log('Content Preview:', entry.content.substring(0, 200) + '...')
      console.log('Metadata:', entry.metadata)
    } else {
      console.log('No entries found')
    }

  } catch (error) {
    console.error('Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCrawler()
