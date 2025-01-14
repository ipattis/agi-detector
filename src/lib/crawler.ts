import axios from 'axios';
import * as cheerio from 'cheerio';
import { RateLimiter } from './openai';
import crypto from 'crypto';
import { saveArticle, markArticlesAsOld } from './db';
import { CronJob } from 'cron';

let currentCrawlJob: CronJob | null = null;
let isCurrentlyCrawling = false;

interface CrawledArticle {
  title: string;
  content: string;
  url: string;
  metadata: {
    source: string;
    timestamp: string;
    id: string;
    sourceUrl: string;
  };
}

// Sources to monitor
export const SOURCES = {
  RESEARCH_BLOGS: [
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog',
      rssUrl: 'https://openai.com/blog/rss.xml',
      selector: 'article.post',
      titleSelector: 'h1',
      contentSelector: '.post-content',
      linkSelector: 'a.post-card',
      transform: {
        url: (url: string) => url.startsWith('http') ? url : `https://openai.com${url}`
      }
    },
    {
      name: 'DeepMind Research',
      url: 'https://deepmind.google/research/',
      selector: 'article.research-card',
      titleSelector: 'h3.research-card__title',
      contentSelector: '.research-card__description',
      linkSelector: 'a.research-card__link',
      transform: {
        url: (url: string) => url.startsWith('http') ? url : `https://deepmind.google${url}`
      }
    },
    {
      name: 'Anthropic Research',
      url: 'https://www.anthropic.com/research',
      selector: 'article.research-item',
      titleSelector: 'h2.research-item__title',
      contentSelector: '.research-item__description',
      linkSelector: 'a.research-item__link',
      transform: {
        url: (url: string) => url.startsWith('http') ? url : `https://www.anthropic.com${url}`
      }
    },
    {
      name: 'Microsoft AI Blog',
      url: 'https://blogs.microsoft.com/ai/',
      selector: 'article.post',
      titleSelector: '.entry-title',
      contentSelector: '.entry-content',
      linkSelector: '.entry-title a',
      transform: {
        url: (url: string) => url.startsWith('http') ? url : url
      }
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
  successfulSources: { source: string }[];
  failedSources: { source: string; error: string }[];
  crawlDuration: number;
  crawlStartTime: string;
  crawlEndTime: string;
  totalRequests: number;
  failedRequests: number;
  retryCount: number;
  averageContentLength: number;
  articlesPerSource: Record<string, number>;
}

let metrics: CrawlMetrics = {
  totalArticles: 0,
  successfulSources: [],
  failedSources: [],
  crawlDuration: 0,
  crawlStartTime: '',
  crawlEndTime: '',
  totalRequests: 0,
  failedRequests: 0,
  retryCount: 0,
  averageContentLength: 0,
  articlesPerSource: {},
};

export function getCurrentMetrics(): CrawlMetrics {
  return metrics;
}

export async function startCrawl() {
  if (isCurrentlyCrawling) {
    console.warn('A crawl is already in progress');
    return {
      success: false,
      error: 'A crawl is already in progress',
      metrics: getCurrentMetrics()
    };
  }

  isCurrentlyCrawling = true;
  metrics.crawlStartTime = new Date().toISOString();
  metrics.totalRequests = 0;
  metrics.failedRequests = 0;
  metrics.retryCount = 0;

  try {
    const articles = await crawlSources();
    metrics.crawlEndTime = new Date().toISOString();
    metrics.crawlDuration = new Date(metrics.crawlEndTime).getTime() - new Date(metrics.crawlStartTime).getTime();
    return {
      success: true,
      articles,
      metrics: getCurrentMetrics()
    };
  } catch (error) {
    console.error('Error during crawl:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during crawl',
      metrics: getCurrentMetrics()
    };
  } finally {
    isCurrentlyCrawling = false;
  }
}

export function scheduleCrawl(cronSchedule: string) {
  if (currentCrawlJob) {
    currentCrawlJob.stop();
  }

  currentCrawlJob = new CronJob(cronSchedule, async () => {
    try {
      await startCrawl();
    } catch (error) {
      console.error('Scheduled crawl failed:', error);
    }
  });

  currentCrawlJob.start();
}

export async function analyzeCrawlData() {
  // Reset metrics for new analysis
  metrics = {
    ...metrics,
    totalArticles: 0,
    successfulSources: [],
    failedSources: [],
    averageContentLength: 0,
    articlesPerSource: {},
  };

  try {
    // Mark all existing articles as old before the new crawl
    await markArticlesAsOld();
    
    // Start a new crawl
    await startCrawl();
    
    return metrics;
  } catch (error) {
    console.error('Error analyzing crawl data:', error);
    throw error;
  }
}

export async function crawlSource(source: any): Promise<CrawledArticle[]> {
  const parsedUrl = new URL(source.url);
  const rateLimiter = getRateLimiter(parsedUrl.hostname);
  let retries = 0;
  let articles: CrawledArticle[] = [];

  while (retries < MAX_RETRIES) {
    try {
      console.log(`[Crawler] Starting to crawl ${source.name} at ${source.url} (attempt ${retries + 1}/${MAX_RETRIES})`);
      
      // Add random delay before request
      await delay(getRandomDelay());
      
      // Try RSS feed first if available
      if (source.rssUrl) {
        try {
          const rssResponse = await rateLimiter.add(() => 
            axios.get(source.rssUrl!, {
              headers: getHeaders(source.rssUrl!),
              timeout: 30000,
              maxRedirects: 5,
              validateStatus: (status) => status < 400,
            })
          );

          if (rssResponse.data) {
            const $ = cheerio.load(rssResponse.data, { xmlMode: true });
            const timestamp = new Date().toISOString();

            $('item').each((_, element) => {
              try {
                const title = $(element).find('title').text().trim();
                const content = $(element).find('description').text().trim();
                const url = $(element).find('link').text().trim();

                if (title && content && url) {
                  const id = crypto.createHash('md5').update(url).digest('hex');
                  articles.push({
                    title,
                    content,
                    url,
                    metadata: {
                      source: source.name,
                      timestamp,
                      id,
                      sourceUrl: source.rssUrl!
                    }
                  });
                }
              } catch (error) {
                console.error(`[Crawler] Error parsing RSS article from ${source.name}:`, error);
              }
            });

            if (articles.length > 0) {
              console.log(`[Crawler] Successfully parsed ${articles.length} articles from RSS feed for ${source.name}`);
              break;
            }
          }
        } catch (error) {
          console.log(`[Crawler] Failed to fetch RSS feed for ${source.name}, falling back to HTML scraping:`, error);
        }
      }

      // Fall back to HTML scraping if RSS failed or no articles were found
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

      const $ = cheerio.load(response.data);
      const timestamp = new Date().toISOString();

      $(source.selector).each((_, element) => {
        try {
          let title = $(element).find(source.titleSelector).first().text().trim();
          let content = $(element).find(source.contentSelector).text().trim();
          let url = $(element).find(source.linkSelector).first().attr('href') || '';

          // Apply transformations if defined
          if (source.transform) {
            if (source.transform.title) {
              title = source.transform.title(title);
            }
            if (source.transform.content) {
              content = source.transform.content(content);
            }
            if (source.transform.url) {
              url = source.transform.url(url);
            }
          }

          if (title && content && url) {
            const id = crypto.createHash('md5').update(url).digest('hex');
            articles.push({
              title,
              content,
              url,
              metadata: {
                source: source.name,
                timestamp,
                id,
                sourceUrl: source.url
              }
            });
          }
        } catch (error) {
          console.error(`[Crawler] Error parsing article from ${source.name}:`, error);
        }
      });

      if (articles.length > 0) {
        // Save articles to database
        const savedArticles = await Promise.all(
          articles.map(article => 
            saveArticle({
              url: article.url,
              title: article.title,
              content: article.content,
              source: article.metadata.source,
              metadata: article.metadata,
            })
          )
        );

        // Update metrics
        metrics.totalArticles += savedArticles.filter(result => result.isNew).length;
        metrics.successfulSources.push({ source: source.name });
        metrics.averageContentLength = articles.reduce((acc, curr) => acc + curr.content.length, 0) / articles.length;
        metrics.articlesPerSource[source.name] = (metrics.articlesPerSource[source.name] || 0) + savedArticles.filter(result => result.isNew).length;

        break; // Exit retry loop on success
      } else {
        throw new Error('No articles found');
      }
    } catch (error) {
      retries++;
      metrics.retryCount++;
      metrics.failedRequests++;

      if (retries === MAX_RETRIES) {
        console.error(`[Crawler] Failed to crawl ${source.name} after ${MAX_RETRIES} attempts:`, error);
        metrics.failedSources.push({
          source: source.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return [];
      }

      console.log(`[Crawler] Retrying ${source.name} in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY);
    }
  }

  return articles;
}

export async function crawlSources(): Promise<CrawledArticle[]> {
  const allSources = [
    ...SOURCES.RESEARCH_BLOGS,
    ...SOURCES.NEWS_SITES,
    ...SOURCES.ACADEMIC,
  ];

  const results = await Promise.all(allSources.map(crawlSource));
  const allArticles = results.flat();

  return allArticles;
}

// Add random delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Update the source type to include new selectors
type Source = {
  name: string;
  url: string;
  rssUrl?: string;
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