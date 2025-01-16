import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import pThrottle from 'p-throttle';
import crypto from 'crypto';
import puppeteer, { Browser } from 'puppeteer';

const prisma = new PrismaClient();

// Rate limit to 1 request per second
const throttle = pThrottle({
  limit: 1,
  interval: 1000
});

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const COMMON_COOKIES = [
  '_ga=GA1.1.123456789.1234567890',
  '_ga_ABCDEFGHIJ=GS1.1.1234567890.1.1.1234567890.0.0.0',
  'cf_clearance=abcdef1234567890',
  'OptanonAlertBoxClosed=2024-01-16T12:00:00.000Z',
  'OptanonConsent=isGpcEnabled=0&datestamp=2024-01-16T12:00:00.000Z&version=6.0.0',
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function fetchWithPuppeteer(url: string, maxRetries = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let browser: Browser | undefined;
    try {
      // Add random delay between retries
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ]
      });

      // Create new page
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: 1920,
        height: 1080
      });

      // Set user agent
      await page.setUserAgent(getRandomUserAgent());

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'DNT': '1',
      });

      // Set cookies
      await page.setCookie(...COMMON_COOKIES.map(cookie => ({ name: cookie.split('=')[0], value: cookie.split('=')[1], domain: new URL(url).hostname })));

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      if (!response) {
        throw new Error('No response received');
      }

      const status = response.status();

      if (status === 403) {
        throw new Error('Access forbidden - site may be blocking automated access');
      }

      if (status === 429) {
        throw new Error('Rate limited - too many requests');
      }

      if (status !== 200) {
        throw new Error(`HTTP error ${status}`);
      }

      // Wait for content to load
      await page.waitForSelector('body', { timeout: 5000 });

      // Get page content
      const content = await page.content();

      return {
        data: content,
        status: status,
        headers: response.headers()
      };

    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  throw lastError || new Error('Max retries reached');
}

export async function crawlUrl(sourceId: string): Promise<void> {
  try {
    // Get source from database
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    // Parse content hints
    const hints = parseContentHints(source.contentHints || '');

    // Fetch the page with Puppeteer
    const response = await fetchWithPuppeteer(source.url);

    // Load the HTML into cheerio
    const $ = cheerio.load(response.data);

    // Extract content using hints
    const title = extractContent(hints.title, $) || $('title').text() || '';
    const content = extractContent(hints.content, $) || $('body').text() || '';

    // Clean the content
    const cleanedTitle = cleanText(title);
    const cleanedContent = cleanText(content);

    // Generate hash
    const hash = crypto
      .createHash('sha256')
      .update(cleanedContent)
      .digest('hex');

    // Create new entry
    await prisma.entry.create({
      data: {
        sourceId,
        title: cleanedTitle,
        content: cleanedContent,
        hash,
        metadata: {
          statusCode: response.status,
          contentLength: response.data.length,
          headers: JSON.stringify(response.headers)
        }
      },
    });

    // Update source status
    await prisma.source.update({
      where: { id: sourceId },
      data: { 
        status: 'ACTIVE',
        lastError: null
      },
    });

  } catch (error) {
    console.error(`Error crawling ${sourceId}:`, error);
    await updateSourceError(sourceId, error instanceof Error ? error.message : 'Unknown error');
  }
}

function parseContentHints(hints: string): { title: string; content: string } {
  const result = {
    title: '',
    content: ''
  };

  const lines = hints.split('\n').map(line => line.trim());
  
  for (const line of lines) {
    if (line.startsWith('title:')) {
      result.title = line.replace('title:', '').trim();
    } else if (line.startsWith('content:')) {
      result.content = line.replace('content:', '').trim();
    }
  }

  return result;
}

type CheerioRoot = ReturnType<typeof cheerio.load>;

function extractContent(selector: string, $: CheerioRoot): string {
  if (!selector) return '';

  try {
    // Try the exact selector first
    let elements = $(selector);
    
    // If no elements found, try some variations
    if (elements.length === 0) {
      // Try without class modifiers
      const baseSelector = selector.replace(/\.[^\s.#]+/g, '');
      elements = $(baseSelector);
      
      // Try with partial class match
      if (elements.length === 0) {
        const classMatch = selector.match(/\.[^\s.#]+/);
        if (classMatch) {
          const partialClass = classMatch[0];
          elements = $(`*[class*="${partialClass.substring(1)}"]`);
        }
      }
    }

    // Get text from all matching elements
    return elements.map((_, el) => $(el).text()).get().join('\n');
  } catch (error) {
    console.error('Error extracting content:', error);
    return '';
  }
}

function cleanText(text: string): string {
  return text
    .replace(/[\n\r]+/g, ' ')  // Replace newlines with spaces
    .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
    .trim();
}

async function updateSourceError(sourceId: string, error: string): Promise<void> {
  await prisma.source.update({
    where: { id: sourceId },
    data: {
      status: 'ERROR',
      lastError: error
    },
  });
}