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
    } catch (error) {
      setError('Failed to fetch metrics');
      console.error('Error fetching metrics:', error);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Crawl Overview</h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Total Articles</dt>
            <dd className="text-2xl font-bold">{metrics.totalArticles}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Success Rate</dt>
            <dd className="text-2xl font-bold">
              {((metrics.successfulSources.length / 
                (metrics.successfulSources.length + metrics.failedSources.length)) * 100).toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Duration</dt>
            <dd className="text-2xl font-bold">{formatDuration(metrics.crawlDuration)}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Request Statistics</h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Total Requests</dt>
            <dd className="text-2xl font-bold">{metrics.totalRequests}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Failed Requests</dt>
            <dd className="text-2xl font-bold">{metrics.failedRequests}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Retry Count</dt>
            <dd className="text-2xl font-bold">{metrics.retryCount}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Content Statistics</h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Average Content Length</dt>
            <dd className="text-2xl font-bold">{Math.round(metrics.averageContentLength)} chars</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Start Time</dt>
            <dd className="text-sm">{new Date(metrics.crawlStartTime).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">End Time</dt>
            <dd className="text-sm">{new Date(metrics.crawlEndTime).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
