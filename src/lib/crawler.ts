import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { RateLimiter } from './openai';
import crypto from 'crypto';

interface CrawledArticle {
  title: string;
  content: string;
  url: string;
  metadata: {
    source: string;
    timestamp: string;
    id: string;
  };
}

// Sources to monitor
export const SOURCES = {
  RESEARCH_BLOGS: [
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog',
      selector: 'article',
      titleSelector: 'h2',
      contentSelector: '.content',
      linkSelector: 'a',
      transform: {
        url: (url: string) => url.startsWith('http') ? url : `https://openai.com${url}`
      }
    },
    {
      name: 'DeepMind Research',
      url: 'https://deepmind.google/research/',
      selector: 'article',
      titleSelector: 'h3',
      contentSelector: '.research-card__description',
      linkSelector: 'a',
      transform: {
        url: (url: string) => url.startsWith('http') ? url : `https://deepmind.google${url}`
      }
    },
    {
      name: 'Anthropic Blog',
      url: 'https://www.anthropic.com/news',
      selector: '.news-item, article',
      titleSelector: 'h2, h3',
      contentSelector: '.content, p',
      linkSelector: 'a',
    },
    {
      name: 'Microsoft AI Blog',
      url: 'https://blogs.microsoft.com/ai/',
      selector: 'article.post',
      titleSelector: '.entry-title',
      contentSelector: '.entry-content',
      linkSelector: 'a.entry-title',
    },
  ],
  NEWS_SITES: [
    {
      name: 'TechCrunch AI',
      url: 'https://techcrunch.com/category/artificial-intelligence/',
      selector: 'article.post-block',
      titleSelector: 'h2',
      contentSelector: '.post-block__content',
      linkSelector: 'h2 a',
    },
    {
      name: 'VentureBeat AI',
      url: 'https://venturebeat.com/category/ai/',
      selector: 'article.ArticleListing',
      titleSelector: 'h2',
      contentSelector: '.ArticleExcerpt',
      linkSelector: 'h2 a',
    },
  ],
  ACADEMIC: [
    {
      name: 'arXiv AI',
      url: 'https://arxiv.org/list/cs.AI/recent',
      selector: 'dl.abstractCitation',
      titleSelector: '.list-title',
      contentSelector: '.list-authors, .list-comments, .list-subjects',
      linkSelector: '.list-identifier a',
      transform: {
        title: (text: string) => text.replace(/^Title:\s+/, '').trim(),
        content: (text: string) => text.replace(/\n+/g, ' ').trim(),
        url: (url: string) => url.startsWith('http') ? url : `https://arxiv.org${url}`
      }
    },
  ],
};

// Improved headers with rotating User-Agents
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// More realistic headers with rotating values
const getHeaders = (url: string) => {
  const parsedUrl = new URL(url);
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Host': parsedUrl.hostname,
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': `https://www.google.com/search?q=${encodeURIComponent(parsedUrl.hostname)}`,
  };
};

// Add random delay between requests (2-10 seconds)
const getRandomDelay = () => Math.floor(Math.random() * 8000) + 2000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Rate limiter configuration (1 request per 3 seconds per domain)
const rateLimiters = new Map<string, RateLimiter>();

const getRateLimiter = (domain: string) => {
  if (!rateLimiters.has(domain)) {
    rateLimiters.set(domain, new RateLimiter());
  }
  return rateLimiters.get(domain)!;
};

export interface CrawlMetrics {
  totalArticles: number;
  articlesPerSource: { [key: string]: number };
  successfulSources: string[];
  failedSources: { source: string; error: string }[];
  averageContentLength: number;
  crawlStartTime: string;
  crawlEndTime: string;
  crawlDuration: number;
  totalRequests: number;
  failedRequests: number;
  retryCount: number;
}

let currentMetrics: CrawlMetrics = {
  totalArticles: 0,
  articlesPerSource: {},
  successfulSources: [],
  failedSources: [],
  averageContentLength: 0,
  crawlStartTime: '',
  crawlEndTime: '',
  crawlDuration: 0,
  totalRequests: 0,
  failedRequests: 0,
  retryCount: 0,
};

export function resetMetrics() {
  currentMetrics = {
    totalArticles: 0,
    articlesPerSource: {},
    successfulSources: [],
    failedSources: [],
    averageContentLength: 0,
    crawlStartTime: '',
    crawlEndTime: '',
    crawlDuration: 0,
    totalRequests: 0,
    failedRequests: 0,
    retryCount: 0,
  };
}

export function getCurrentMetrics(): CrawlMetrics {
  return currentMetrics;
}

export async function crawlSource(source: Source): Promise<CrawledArticle[]> {
  const parsedUrl = new URL(source.url);
  const rateLimiter = getRateLimiter(parsedUrl.hostname);
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`[Crawler] Starting to crawl ${source.name} at ${source.url} (attempt ${retries + 1}/${MAX_RETRIES})`);
      
      // Add random delay before request
      await delay(getRandomDelay());
      
      // Use rate limiter with proper interface
      const response = await rateLimiter.add(() => 
        axios.get(source.url, {
          headers: getHeaders(source.url),
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: (status) => status < 400,
        })
      );

      console.log(`[Crawler] Got response from ${source.name}, status: ${response.status}`);
      
      if (!response.data) {
        throw new Error('Empty response');
      }

      // Debug response data
      console.log(`[Crawler] Response data length: ${response.data.length} bytes`);
      console.log(`[Crawler] First 200 chars of response:`, response.data.substring(0, 200));

      const $ = cheerio.load(response.data);
      const articles: CrawledArticle[] = [];

      console.log(`[Crawler] Looking for elements matching selector: ${source.selector}`);
      const elements = $(source.selector);
      console.log(`[Crawler] Found ${elements.length} matching elements`);

      // Debug first element
      if (elements.length > 0) {
        console.log(`[Crawler] First element HTML:`, $(elements[0]).html()?.substring(0, 200));
      }

      elements.each((_, element) => {
        const $element = $(element);
        
        // Debug element selectors
        console.log(`[Crawler] Processing element selectors for ${source.name}:`);
        console.log(`- Title selector "${source.titleSelector}":`, $element.find(source.titleSelector).length, 'matches');
        console.log(`- Content selector "${source.contentSelector}":`, $element.find(source.contentSelector).length, 'matches');
        console.log(`- Link selector "${source.linkSelector}":`, $element.find(source.linkSelector).length, 'matches');

        let title = $element.find(source.titleSelector).first().text().trim();
        let content = $element.find(source.contentSelector).first().text().trim();
        let url = $element.find(source.linkSelector).first().attr('href') || '';

        // Apply transformations if they exist
        if (source.transform) {
          if (source.transform.title) title = source.transform.title(title);
          if (source.transform.content) content = source.transform.content(content);
          if (source.transform.url) url = source.transform.url(url);
        }

        // If content is empty, try getting it from the element itself
        if (!content) {
          content = $element.text().trim();
        }

        console.log(`[Crawler] Processing element - Title: ${title ? title.substring(0, 50) + '...' : 'none'}`);
        console.log(`[Crawler] Content length: ${content?.length || 0} characters`);
        console.log(`[Crawler] URL: ${url || 'none'}`);

        if (title && content) {
          articles.push({
            title,
            content,
            url,
            metadata: {
              source: source.name,
              timestamp: new Date().toISOString(),
              id: crypto.randomUUID()
            },
          });
        } else {
          console.log(`[Crawler] Skipping element - missing title or content`);
        }
      });

      console.log(`[Crawler] Successfully found ${articles.length} articles from ${source.name}`);
      return articles;
    } catch (error) {
      currentMetrics.retryCount++;
      if (axios.isAxiosError(error)) {
        console.error(`[Crawler] Error crawling ${source.name}:`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url
        });
      } else {
        console.error(`[Crawler] Unknown error crawling ${source.name}:`, error);
      }
      retries++;
      if (retries < MAX_RETRIES) {
        console.log(`[Crawler] Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await delay(RETRY_DELAY);
      } else {
        return [];
      }
    }
  }

  return [];
}

export async function crawlAllSources(): Promise<CrawledArticle[]> {
  resetMetrics();
  currentMetrics.crawlStartTime = new Date().toISOString();
  const allArticles: CrawledArticle[] = [];

  for (const category of Object.values(SOURCES)) {
    for (const source of category) {
      currentMetrics.totalRequests++;
      try {
        const articles = await crawlSource(source);
        allArticles.push(...articles);
        
        // Update metrics
        currentMetrics.articlesPerSource[source.name] = articles.length;
        currentMetrics.successfulSources.push(source.name);
        
        const totalContentLength = articles.reduce((sum, article) => sum + article.content.length, 0);
        if (articles.length > 0) {
          const sourceAverage = totalContentLength / articles.length;
          currentMetrics.averageContentLength = 
            (currentMetrics.averageContentLength * currentMetrics.totalArticles + sourceAverage * articles.length) / 
            (currentMetrics.totalArticles + articles.length);
        }
        currentMetrics.totalArticles += articles.length;
      } catch (error) {
        currentMetrics.failedRequests++;
        currentMetrics.failedSources.push({
          source: source.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  currentMetrics.crawlEndTime = new Date().toISOString();
  currentMetrics.crawlDuration = new Date(currentMetrics.crawlEndTime).getTime() - new Date(currentMetrics.crawlStartTime).getTime();

  console.log(`Crawled ${allArticles.length} articles`);
  return allArticles;
}

// Add random delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Update the source type to include new selectors
type Source = {
  name: string;
  url: string;
  selector: string;
  titleSelector: string;
  contentSelector: string;
  linkSelector: string;
  transform?: {
    title?: (text: string) => string;
    content?: (text: string) => string;
    url?: (url: string) => string;
  };
};