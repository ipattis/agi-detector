import { PrismaClient } from '@prisma/client'
import { chromium, devices } from '@playwright/test'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function clearDatabase() {
  console.log('Clearing database...')
  await prisma.entry.deleteMany()
  await prisma.source.deleteMany()
  console.log('Database cleared')
}

async function randomDelay(min: number, max: number) {
  const delay = Math.floor(Math.random() * (max - min + 1) + min)
  await new Promise(resolve => setTimeout(resolve, delay))
}

async function extractArxivMetadata(page: any) {
  return await page.evaluate(() => {
    const title = document.querySelector('.title')?.textContent?.replace('Title:', '')?.trim() || ''
    const authors = Array.from(document.querySelectorAll('.authors a'))
      .map(author => (author as HTMLElement).textContent?.trim())
      .filter(author => author) || []
    const abstract = document.querySelector('.abstract')?.textContent?.replace('Abstract:', '')?.trim() || ''
    const date = document.querySelector('.submission-history')?.textContent?.match(/\[v1\] (.+?)\n/)?.[1] || ''
    
    return {
      title,
      authors,
      abstract,
      date,
      categories: Array.from(document.querySelectorAll('.primary-subject, .secondary-subject'))
        .map(cat => (cat as HTMLElement).textContent?.trim())
        .filter(cat => cat)
    }
  })
}

async function crawlArxivPaper(url: string) {
  console.log('Starting to crawl arXiv paper...')
  
  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  })
  
  try {
    // Create new context
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    })
    
    // Create new page
    const page = await context.newPage()
    
    // Navigate to paper
    console.log('Navigating to paper...')
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    
    // Wait for content to load
    await page.waitForSelector('.abstract')
    
    // Extract metadata
    console.log('Extracting metadata...')
    const metadata = await extractArxivMetadata(page)
    console.log('Metadata:', metadata)
    
    // Check if source already exists
    let source = await prisma.source.findUnique({
      where: { url }
    })
    
    // Create source if it doesn't exist
    if (!source) {
      source = await prisma.source.create({
        data: {
          url,
          status: 'ACTIVE'
        }
      })
    }
    
    // Generate hash for content
    const hash = crypto.createHash('sha256')
      .update(metadata.abstract + metadata.title)
      .digest('hex')
    
    // Save entry
    await prisma.entry.create({
      data: {
        sourceId: source.id,
        title: metadata.title,
        content: metadata.abstract,
        summary: metadata.abstract.slice(0, 500) + '...', // First 500 characters as summary
        hash,
        metadata: {
          authors: metadata.authors,
          categories: metadata.categories,
          publishedDate: metadata.date,
          crawledAt: new Date().toISOString(),
          url: url
        }
      }
    })
    
    console.log('Successfully saved paper to database')
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'debug-arxiv-paper.png',
      fullPage: true 
    })
    
  } catch (error) {
    console.error('Error crawling paper:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  try {
    await clearDatabase()
    await crawlArxivPaper('https://arxiv.org/abs/2303.01469')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
