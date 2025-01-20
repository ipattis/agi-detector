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

interface ContentScore {
  element: cheerio.Element;
  score: number;
}

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function fetchWithPuppeteer(url: string, maxRetries = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let browser: Browser | undefined;
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

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

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(getRandomUserAgent());
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'DNT': '1',
      });

      await page.setCookie(...COMMON_COOKIES.map(cookie => ({ 
        name: cookie.split('=')[0], 
        value: cookie.split('=')[1], 
        domain: new URL(url).hostname 
      })));

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

      await page.waitForSelector('body', { timeout: 5000 });
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

function detectMainContent($: cheerio.Root): { content: string; score: number } {
  const contentScores: ContentScore[] = [];
  
  // First, try to find content using schema.org markup
  const jsonLd = $('script[type="application/ld+json"]').text();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      if (data.articleBody || (data['@graph'] && data['@graph'].find((item: any) => item.articleBody))) {
        const articleBody = data.articleBody || data['@graph'].find((item: any) => item.articleBody).articleBody;
        return {
          content: cleanText(articleBody),
          score: 100
        };
      }
    } catch (e) {
      // Continue with DOM-based detection if JSON-LD parsing fails
    }
  }
  
  // Try common article selectors first
  const commonSelectors = [
    'article[class*="post"]',
    'div[class*="post-content"]',
    'div[class*="article-content"]',
    'div[class*="entry-content"]',
    'main article',
    'div[role="main"]'
  ];

  for (const selector of commonSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text();
      if (text.length > 500) { // Minimum content length
        element.find('script, style, iframe, form, nav, header, footer').remove();
        return {
          content: cleanText(element.text()),
          score: 90
        };
      }
    }
  }
  
  // Fallback to scoring-based detection
  $('article, div, section').each((_, element) => {
    const $el = $(element);
    let score = 0;
    
    // Text length score (more weight)
    const text = $el.text();
    score += text.length / 50;

    // Density of paragraph tags (more weight)
    const paragraphs = $el.find('p').length;
    score += paragraphs * 20;

    // Presence of article-related classes/ids (more specific)
    const classAndId = ($el.attr('class') || '') + ($el.attr('id') || '');
    if (/article|post|content|entry|blog/i.test(classAndId)) {
      score += 50;
    }

    // Negative indicators (stronger penalties)
    if (/comment|sidebar|footer|header|nav|menu|widget|social|share|related|ad/i.test(classAndId)) {
      score -= 100;
    }

    // Check for meaningful HTML structure
    const hasHeadings = $el.find('h1, h2, h3').length > 0;
    if (hasHeadings) score += 20;

    // Check for images with captions
    const hasImages = $el.find('img[alt], figure').length > 0;
    if (hasImages) score += 10;

    // Check for code blocks (common in technical blogs)
    const hasCode = $el.find('pre, code').length > 0;
    if (hasCode) score += 15;

    contentScores.push({ element, score });
  });

  // Sort by score and get the best match
  const bestMatch = contentScores.sort((a, b) => b.score - a.score)[0];
  
  if (bestMatch && bestMatch.score > 100) { // Higher threshold
    const $content = $(bestMatch.element);
    // Remove non-content elements
    $content.find('script, style, iframe, form, nav, header, footer, .social, .share, .related, .comments').remove();
    
    const cleanContent = cleanText($content.text());
    // Ensure minimum content length
    if (cleanContent.length > 500) {
      return {
        content: cleanContent,
        score: bestMatch.score
      };
    }
  }
  
  return { content: '', score: 0 };
}

function detectTitle($: cheerio.Root): string {
  const candidates = [
    // Try article heading first
    $('article h1').first().text(),
    // Try main heading
    $('main h1').first().text(),
    // Try page title
    $('h1').first().text(),
    // Fallback to meta title
    $('meta[property="og:title"]').attr('content'),
    $('title').text()
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

function detectPublishDate($: cheerio.Root): string | null {
  // Try schema.org metadata
  const jsonLd = $('script[type="application/ld+json"]').text();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      if (data.datePublished) {
        return new Date(data.datePublished).toISOString();
      }
    } catch (e) {
      // Continue if JSON parsing fails
    }
  }

  // Try meta tags
  const metaDates = [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[name="publication-date"]').attr('content'),
    $('meta[name="date"]').attr('content')
  ];

  for (const date of metaDates) {
    if (date) {
      try {
        return new Date(date).toISOString();
      } catch (e) {
        // Continue if date parsing fails
      }
    }
  }

  // Try common date elements
  const dateSelectors = [
    'time[datetime]',
    '[class*="date"]',
    '[class*="time"]',
    '[itemprop="datePublished"]'
  ];

  for (const selector of dateSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const dateStr = element.attr('datetime') || element.text();
      try {
        return new Date(dateStr).toISOString();
      } catch (e) {
        // Continue if date parsing fails
      }
    }
  }

  return null;
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

export async function crawlUrl(sourceId: string): Promise<void> {
  try {
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    console.log('Fetching URL:', source.url);
    const response = await fetchWithPuppeteer(source.url);
    console.log('Response status:', response.status);
    console.log('Response length:', response.data.length);

    const $ = cheerio.load(response.data);
    console.log('Loaded HTML with cheerio');

    // Wait for dynamic content to load (if any)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Detect content intelligently
    console.log('Attempting to detect content...');
    let { content, score } = detectMainContent($);
    console.log('Initial content detection:', { found: !!content, score });

    if (!content) {
      console.log('First attempt failed, trying alternative strategy...');
      // Try again with a different strategy
      $('script').remove(); // Remove all scripts to clean up the DOM
      content = $('body').text();
      console.log('Body text length:', content.length);
      
      if (content.length > 500) {
        score = 50; // Default score for body content
        console.log('Using body text as fallback');
      } else {
        console.log('Body text too short:', content.length);
        throw new Error('Could not detect main content');
      }
    }

    // Detect title intelligently
    console.log('Detecting title...');
    let title = detectTitle($);
    console.log('Initial title detection:', { found: !!title });

    if (!title) {
      console.log('Title not found, extracting from URL...');
      // Try to extract title from URL if not found in content
      const urlParts = source.url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      title = lastPart
        .replace(/-/g, ' ')
        .replace(/\.[^/.]+$/, '') // Remove file extension
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      console.log('Generated title:', title);
    }

    // Detect publish date
    console.log('Detecting publish date...');
    const publishDate = detectPublishDate($);
    console.log('Publish date:', publishDate);

    // Generate hash
    const hash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');

    console.log('Creating entry...');
    // Create new entry
    await prisma.entry.create({
      data: {
        sourceId,
        title,
        content,
        hash,
        metadata: {
          statusCode: response.status,
          contentLength: response.data.length,
          headers: response.headers,
          publishDate,
          contentScore: score,
          crawledAt: new Date().toISOString()
        }
      },
    });

    console.log('Updating source status...');
    // Update source status
    await prisma.source.update({
      where: { id: sourceId },
      data: { 
        status: 'ACTIVE',
        lastError: null
      },
    });

    console.log('Crawl completed successfully');

  } catch (error) {
    console.error(`Error crawling ${sourceId}:`, error);
    await updateSourceError(sourceId, error instanceof Error ? error.message : 'Unknown error');
  }
}