import { PrismaClient, CrawlResult, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type ArticleMetadata = Prisma.JsonObject & {
  author?: string;
  publishDate?: string;
  category?: string;
  tags?: string[];
};

export interface SaveArticleResult {
  article: CrawlResult;
  isNew: boolean;
}

export async function saveArticle(article: {
  url: string;
  title: string;
  content: string;
  source: string;
  metadata: ArticleMetadata;
}): Promise<SaveArticleResult> {
  const existingArticle = await prisma.crawlResult.findUnique({
    where: { url: article.url },
  });

  if (existingArticle) {
    // Update the existing article
    const updatedArticle = await prisma.crawlResult.update({
      where: { id: existingArticle.id },
      data: {
        title: article.title,
        content: article.content,
        lastUpdated: new Date(),
        isNew: false,
        metadata: article.metadata,
      },
    });
    return { article: updatedArticle, isNew: false };
  }

  // Create a new article
  const newArticle = await prisma.crawlResult.create({
    data: {
      url: article.url,
      title: article.title,
      content: article.content,
      source: article.source,
      metadata: article.metadata,
      isNew: true,
    },
  });

  return { article: newArticle, isNew: true };
}

export async function getNewArticles(limit: number = 10): Promise<CrawlResult[]> {
  return prisma.crawlResult.findMany({
    where: { isNew: true },
    orderBy: { firstCaptured: 'desc' },
    take: limit,
    include: { analysis: true },
  });
}

export async function getAllArticles(
  page: number = 1,
  pageSize: number = 20,
  orderBy: 'firstCaptured' | 'lastUpdated' = 'firstCaptured',
  order: 'asc' | 'desc' = 'desc'
): Promise<{ articles: CrawlResult[]; total: number }> {
  const skip = (page - 1) * pageSize;

  const [articles, total] = await Promise.all([
    prisma.crawlResult.findMany({
      orderBy: { [orderBy]: order },
      skip,
      take: pageSize,
      include: { analysis: true },
    }),
    prisma.crawlResult.count(),
  ]);

  return { articles, total };
}

export async function markArticlesAsOld(): Promise<void> {
  await prisma.crawlResult.updateMany({
    where: { isNew: true },
    data: { isNew: false },
  });
}
