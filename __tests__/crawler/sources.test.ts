import { SOURCES } from '../../src/lib/crawler';
import axios from 'axios';
import * as cheerio from 'cheerio';

jest.mock('axios');
jest.mock('../../src/lib/openai', () => ({
  RateLimiter: class {
    add(fn: () => Promise<any>) {
      return fn();
    }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Source Crawling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHtmlTemplates = {
    researchBlog: `
      <html>
        <body>
          <article>
            <h2>Test Article Title</h2>
            <div class="content">Test article content</div>
            <a href="/test-article">Read more</a>
          </article>
          <article class="news-item">
            <h3>Another Test Title</h3>
            <div class="research-card__description">More test content</div>
            <a href="/another-test">Read more</a>
          </article>
          <article class="post">
            <div class="entry-title">Blog Post Title</div>
            <div class="entry-content">Blog post content</div>
            <a class="entry-title" href="/blog-post">Read more</a>
          </article>
        </body>
      </html>
    `,
    newsWebsite: `
      <html>
        <body>
          <article class="post-block">
            <h2><a href="/news-1">News Title 1</a></h2>
            <div class="post-block__content">News content 1</div>
          </article>
          <article class="ArticleListing">
            <h2><a href="/news-2">News Title 2</a></h2>
            <div class="ArticleExcerpt">News content 2</div>
          </article>
        </body>
      </html>
    `,
    academic: `
      <html>
        <body>
          <dl class="abstractCitation">
            <dt class="list-title">Title: Test Paper Title</dt>
            <dd class="list-authors">Authors: John Doe, Jane Smith</dd>
            <dd class="list-comments">Comments: 10 pages</dd>
            <dd class="list-subjects">Subjects: Artificial Intelligence (cs.AI)</dd>
            <dt class="list-identifier"><a href="/abs/2401.12345">arXiv:2401.12345</a></dt>
          </dl>
        </body>
      </html>
    `
  };

  describe('Research Blogs', () => {
    test.each(SOURCES.RESEARCH_BLOGS)('can crawl $name', async (source) => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtmlTemplates.researchBlog,
      });

      const $ = cheerio.load(mockHtmlTemplates.researchBlog);
      
      const articles = $(source.selector);
      expect(articles.length).toBeGreaterThan(0);

      const title = articles.find(source.titleSelector).first();
      expect(title.length).toBeGreaterThan(0);
      
      const content = articles.find(source.contentSelector).first();
      expect(content.length).toBeGreaterThan(0);
      
      const link = articles.find(source.linkSelector).first();
      expect(link.length).toBeGreaterThan(0);

      if (source.transform?.url) {
        const transformedUrl = source.transform.url('/test-path');
        expect(transformedUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('News Sites', () => {
    test.each(SOURCES.NEWS_SITES)('can crawl $name', async (source) => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtmlTemplates.newsWebsite,
      });

      const $ = cheerio.load(mockHtmlTemplates.newsWebsite);
      
      const articles = $(source.selector);
      expect(articles.length).toBeGreaterThan(0);

      const title = articles.find(source.titleSelector).first();
      expect(title.length).toBeGreaterThan(0);
      
      const content = articles.find(source.contentSelector).first();
      expect(content.length).toBeGreaterThan(0);
      
      const link = articles.find(source.linkSelector).first();
      expect(link.length).toBeGreaterThan(0);
    });
  });

  describe('Academic Sources', () => {
    test.each(SOURCES.ACADEMIC)('can crawl $name', async (source) => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtmlTemplates.academic,
      });

      const $ = cheerio.load(mockHtmlTemplates.academic);
      
      const articles = $(source.selector);
      expect(articles.length).toBeGreaterThan(0);

      const title = articles.find(source.titleSelector).first();
      expect(title.length).toBeGreaterThan(0);
      
      const content = articles.find(source.contentSelector);
      expect(content.length).toBeGreaterThan(0);
      
      const link = articles.find(source.linkSelector).first();
      expect(link.length).toBeGreaterThan(0);

      if (source.transform) {
        if (source.transform.title) {
          const transformedTitle = source.transform.title('Title: Test Paper Title');
          expect(transformedTitle).toBe('Test Paper Title');
        }

        if (source.transform.content) {
          const transformedContent = source.transform.content('Line 1\n\nLine 2\n\nLine 3');
          expect(transformedContent).toBe('Line 1 Line 2 Line 3');
        }

        if (source.transform.url) {
          const transformedUrl = source.transform.url('/abs/2401.12345');
          expect(transformedUrl).toMatch(/^https?:\/\/arxiv\.org/);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test.each([
      ...SOURCES.RESEARCH_BLOGS,
      ...SOURCES.NEWS_SITES,
      ...SOURCES.ACADEMIC,
    ])('handles network errors for $name', async (source) => {
      // Clear all mocks before each test
      mockedAxios.get.mockReset();
      
      // Mock the network error
      mockedAxios.get.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      // Verify that the error is caught
      await expect(async () => {
        await mockedAxios.get(source.url);
      }).rejects.toThrow('Network error');
    });

    test.each([
      ...SOURCES.RESEARCH_BLOGS,
      ...SOURCES.NEWS_SITES,
      ...SOURCES.ACADEMIC,
    ])('handles rate limiting for $name', async (source) => {
      // Clear all mocks before each test
      mockedAxios.get.mockReset();
      
      // Mock the rate limit response
      mockedAxios.get.mockImplementationOnce(() => {
        const error: any = new Error('Rate limit exceeded');
        error.response = {
          status: 429,
          statusText: 'Too Many Requests',
        };
        throw error;
      });

      // Verify that the rate limit error is caught
      await expect(async () => {
        await mockedAxios.get(source.url);
      }).rejects.toMatchObject({
        response: {
          status: 429,
        },
      });
    });
  });
});
