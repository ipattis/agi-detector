import { useEffect, useState } from 'react';
import { CrawlMetrics } from '@/lib/crawler';

export default function CrawlMetricsComponent() {
  const [metrics, setMetrics] = useState<CrawlMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse">Loading metrics...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Crawler Metrics</h2>
      
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Articles</h3>
          <p className="text-2xl font-semibold">{metrics.totalArticles}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate</h3>
          <p className="text-2xl font-semibold">
            {((metrics.successfulSources.length / (metrics.successfulSources.length + metrics.failedSources.length)) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Crawl Duration</h3>
          <p className="text-2xl font-semibold">{formatDuration(metrics.crawlDuration)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Content Length</h3>
          <p className="text-2xl font-semibold">{Math.round(metrics.averageContentLength)} chars</p>
        </div>
      </div>

      {/* Articles per Source */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Articles per Source</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(metrics.articlesPerSource).map(([source, count]) => (
            <div key={source} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <span className="font-medium">{source}</span>
              <span className="text-gray-600 dark:text-gray-300">{count} articles</span>
            </div>
          ))}
        </div>
      </div>

      {/* Failed Sources */}
      {metrics.failedSources.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-red-500">Failed Sources</h3>
          <div className="space-y-2">
            {metrics.failedSources.map((failure, index) => (
              <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                <span className="font-medium">{failure.source}</span>
                <p className="text-sm text-red-600 dark:text-red-400">{failure.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Stats */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Request Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
            <p className="text-xl font-semibold">{metrics.totalRequests}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed Requests</p>
            <p className="text-xl font-semibold">{metrics.failedRequests}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-sm text-gray-500 dark:text-gray-400">Retry Count</p>
            <p className="text-xl font-semibold">{metrics.retryCount}</p>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <p>Started: {new Date(metrics.crawlStartTime).toLocaleString()}</p>
        <p>Ended: {new Date(metrics.crawlEndTime).toLocaleString()}</p>
      </div>
    </div>
  );
}
