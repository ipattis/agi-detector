import { useState, useEffect, useCallback } from 'react';
import { CrawlResult } from '@prisma/client';
import { ArticlesList } from '../components/ArticlesList';

interface ArticlesResponse {
  articles: CrawlResult[];
  total?: number;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<CrawlResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOnly, setShowNewOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: showNewOnly ? 'new' : 'all',
        page: page.toString(),
        pageSize: '20',
      });

      const response = await fetch(`/api/articles?${params}`);
      const data: ArticlesResponse = await response.json();
      
      setArticles(data.articles);
      if (data.total) {
        setTotalPages(Math.ceil(data.total / 20));
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [showNewOnly, page]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {showNewOnly ? 'New Articles' : 'All Articles'}
        </h1>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowNewOnly(!showNewOnly);
              setPage(1);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Show {showNewOnly ? 'All' : 'New Only'}
          </button>
          
          {!showNewOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <ArticlesList articles={articles} isLoading={isLoading} />
    </div>
  );
}
