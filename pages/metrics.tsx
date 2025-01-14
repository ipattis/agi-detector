import { useEffect, useState } from 'react';
import { CrawlMetrics } from '../src/lib/crawler';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<CrawlMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Failed to load metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Crawl Metrics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Articles</dt>
              <dd className="text-2xl font-semibold text-gray-900">{metrics.totalArticles}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {((metrics.successfulSources.length / 
                  (metrics.successfulSources.length + metrics.failedSources.length)) * 100).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Average Content Length</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {Math.round(metrics.averageContentLength)} chars
              </dd>
            </div>
          </dl>
        </div>

        {/* Time Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Timing</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Crawl Duration</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {(metrics.crawlDuration / 1000).toFixed(1)}s
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Time</dt>
              <dd className="text-sm text-gray-900">
                {new Date(metrics.crawlStartTime).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">End Time</dt>
              <dd className="text-sm text-gray-900">
                {new Date(metrics.crawlEndTime).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Request Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Requests</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Requests</dt>
              <dd className="text-2xl font-semibold text-gray-900">{metrics.totalRequests}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Failed Requests</dt>
              <dd className="text-2xl font-semibold text-gray-900">{metrics.failedRequests}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Retry Count</dt>
              <dd className="text-2xl font-semibold text-gray-900">{metrics.retryCount}</dd>
            </div>
          </dl>
        </div>

        {/* Articles per Source */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Articles per Source</h2>
          <div className="space-y-2">
            {Object.entries(metrics.articlesPerSource).map(([source, count]) => (
              <div key={source} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{source}</span>
                <span className="text-sm font-medium text-gray-900">{count} articles</span>
              </div>
            ))}
          </div>
        </div>

        {/* Failed Sources */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Failed Sources</h2>
          {metrics.failedSources.length > 0 ? (
            <ul className="space-y-2">
              {metrics.failedSources.map((failure, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium text-red-600">{failure.source}</span>
                  <p className="text-gray-500">{failure.error}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No failed sources</p>
          )}
        </div>
      </div>
    </div>
  );
}
