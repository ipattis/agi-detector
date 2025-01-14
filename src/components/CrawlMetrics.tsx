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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Crawler Metrics</h2>
      
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Total Articles</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{metrics.totalArticles}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Success Rate</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-300">
            {((metrics.successfulSources.length / (metrics.successfulSources.length + metrics.failedSources.length)) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">Crawl Duration</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-300">{formatDuration(metrics.crawlDuration)}</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-2">Avg Content Length</h3>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300">{Math.round(metrics.averageContentLength)} chars</p>
        </div>
      </div>

      {/* Articles per Source */}
      <div className="mt-8">
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Articles per Source</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(metrics.articlesPerSource).map(([source, count]) => (
            <div key={source} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="font-medium text-gray-900 dark:text-white">{source}</span>
              <span className="text-gray-600 dark:text-gray-300 font-semibold">{count} articles</span>
            </div>
          ))}
        </div>
      </div>

      {/* Failed Sources */}
      {metrics.failedSources.length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Failed Sources</h3>
          <div className="space-y-3">
            {metrics.failedSources.map((failure, index) => (
              <div key={index} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <span className="font-medium text-red-800 dark:text-red-200">{failure.source}</span>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{failure.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Stats */}
      <div className="mt-8">
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Request Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalRequests}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Failed Requests</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.failedRequests}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Retry Count</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metrics.retryCount}</p>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="mt-8 space-y-2 text-sm">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Started:</span>{' '}
            <span className="text-gray-900 dark:text-white">{new Date(metrics.crawlStartTime).toLocaleString()}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">Ended:</span>{' '}
            <span className="text-gray-900 dark:text-white">{new Date(metrics.crawlEndTime).toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
