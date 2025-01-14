import React from 'react';
import { CrawlResult } from '@prisma/client';

interface ArticlesListProps {
  articles: CrawlResult[];
  isLoading: boolean;
}

export function ArticlesList({ articles, isLoading }: ArticlesListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!articles?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No articles found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {articles.map((article) => (
        <article key={article.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {article.title}
            </h3>
            {article.isNew && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                New
              </span>
            )}
          </div>
          
          <p className="text-gray-600 mb-4 line-clamp-3">{article.content}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Source: {article.source}</span>
            <span>First seen: {new Date(article.firstCaptured).toLocaleString()}</span>
            {article.lastUpdated !== article.firstCaptured && (
              <span>Last updated: {new Date(article.lastUpdated).toLocaleString()}</span>
            )}
          </div>
          
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800"
            >
              Read more
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
