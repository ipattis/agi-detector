import { useEffect, useState } from 'react';
import { CrawlMetrics } from '@/lib/crawler';
import { CrawlResult } from '@prisma/client';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const [metrics, setMetrics] = useState<CrawlMetrics | null>(null);
  const [articles, setArticles] = useState<CrawlResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawlStatus, setCrawlStatus] = useState<string | null>(null);
  const [schedule, setSchedule] = useState('0 */6 * * *'); // Default: every 6 hours
  const [lastCrawlInfo, setLastCrawlInfo] = useState<{
    startTime: string | null;
    endTime: string | null;
    duration: number | null;
  }>({
    startTime: null,
    endTime: null,
    duration: null
  });

  const { theme } = useTheme();

  // Fetch initial data on component mount
  useEffect(() => {
    fetchMetrics();
    fetchArticles();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      setMetrics(data);
      if (data.crawlStartTime) {
        setLastCrawlInfo({
          startTime: data.crawlStartTime,
          endTime: data.crawlEndTime,
          duration: data.crawlDuration
        });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles?type=new');
      const data = await response.json();
      setArticles(data.articles);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawlAction = async (action: 'start' | 'stop' | 'analyze') => {
    try {
      setLoading(true);
      setCrawlStatus('Starting crawl...');

      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (response.status === 409) {
        setCrawlStatus('A crawl is already in progress');
        if (data.metrics) {
          setMetrics(data.metrics);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start crawl');
      }

      if (action === 'start') {
        setCrawlStatus('Crawl in progress...');
        // Start polling for updates
        const pollInterval = setInterval(async () => {
          const metricsResponse = await fetch('/api/metrics');
          const metricsData = await metricsResponse.json();
          setMetrics(metricsData);
          
          if (metricsData.crawlEndTime) {
            clearInterval(pollInterval);
            setCrawlStatus('Crawl completed');
            fetchArticles(); // Refresh articles after crawl
          }
        }, 5000);

        // Clear interval after 5 minutes to prevent indefinite polling
        setTimeout(() => clearInterval(pollInterval), 300000);
      }

      setMetrics(data.metrics);
      await fetchArticles();

    } catch (error) {
      console.error('Error:', error);
      setCrawlStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (!crawlStatus) return null;
    
    if (metrics?.crawlStartTime && !metrics.crawlEndTime) {
      const duration = Date.now() - new Date(metrics.crawlStartTime).getTime();
      const seconds = Math.floor(duration / 1000);
      const minutes = Math.floor(seconds / 60);
      return `${crawlStatus} (${minutes}m ${seconds % 60}s)`;
    }

    return crawlStatus;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className={`min-h-screen bg-${theme === 'dark' ? 'gray-900' : 'gray-50'} transition-colors`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold text-${theme === 'dark' ? 'white' : 'gray-900'}`}>AGI Detector Dashboard</h1>
          <div className="flex space-x-4">
            <Link 
              href="/articles" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View All Articles
            </Link>
            <Link 
              href="/metrics" 
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Detailed Metrics
            </Link>
          </div>
        </div>

        {/* Crawl Status */}
        {lastCrawlInfo.startTime && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Last Crawl Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Start Time</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatDate(lastCrawlInfo.startTime)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">End Time</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {lastCrawlInfo.endTime ? formatDate(lastCrawlInfo.endTime) : 'In Progress...'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {lastCrawlInfo.duration ? formatDuration(lastCrawlInfo.duration) : 'Calculating...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Crawl Controls */}
        <div className={`bg-${theme === 'dark' ? 'gray-800' : 'white'} rounded-lg shadow-lg p-6 mb-8`}>
          <h2 className={`text-xl font-bold text-${theme === 'dark' ? 'white' : 'gray-900'} mb-4`}>Crawler Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Manual Control</h3>
              <button
                onClick={() => handleCrawlAction('start')}
                disabled={loading}
                className={`w-full px-4 py-2 ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-md transition-colors`}
              >
                {loading ? 'Processing...' : 'Start Manual Crawl'}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className={`text-lg font-semibold text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Schedule Crawl</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md bg-${theme === 'dark' ? 'gray-700' : 'white'} text-${theme === 'dark' ? 'white' : 'gray-900'} border-${theme === 'dark' ? 'gray-600' : 'gray-300'}`}
                  placeholder="Cron Schedule"
                />
                <button
                  onClick={() => handleCrawlAction('start')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Set
                </button>
              </div>
              <p className={`text-sm text-${theme === 'dark' ? 'gray-400' : 'gray-500'}`}>Default: every 6 hours (0 */6 * * *)</p>
            </div>

            <div className="space-y-4">
              <h3 className={`text-lg font-semibold text-${theme === 'dark' ? 'gray-300' : 'gray-700'}`}>Analysis</h3>
              <button
                onClick={() => handleCrawlAction('analyze')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Analyze Data
              </button>
            </div>
          </div>
          {crawlStatus && (
            <div className={`mt-4 p-3 rounded-md ${
              crawlStatus.includes('Error') 
                ? 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800'
                : crawlStatus.includes('progress')
                ? 'bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 border border-green-200 dark:border-green-800'
            }`}>
              {getStatusMessage()}
            </div>
          )}
        </div>

        {/* Metrics Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`bg-blue-50 dark:bg-blue-900/50 rounded-lg p-6 border border-blue-200 dark:border-blue-800`}>
              <h3 className={`text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2`}>Total Articles</h3>
              <p className={`text-3xl font-bold text-blue-600 dark:text-blue-300`}>{metrics.totalArticles}</p>
            </div>
            <div className={`bg-green-50 dark:bg-green-900/50 rounded-lg p-6 border border-green-200 dark:border-green-800`}>
              <h3 className={`text-lg font-semibold text-green-900 dark:text-green-200 mb-2`}>Success Rate</h3>
              <p className={`text-3xl font-bold text-green-600 dark:text-green-300`}>
                {((metrics.successfulSources.length / 
                  (metrics.successfulSources.length + metrics.failedSources.length)) * 100).toFixed(1)}%
              </p>
            </div>
            <div className={`bg-purple-50 dark:bg-purple-900/50 rounded-lg p-6 border border-purple-200 dark:border-purple-800`}>
              <h3 className={`text-lg font-semibold text-purple-900 dark:text-purple-200 mb-2`}>New Articles</h3>
              <p className={`text-3xl font-bold text-purple-600 dark:text-purple-300`}>{articles.length}</p>
            </div>
          </div>
        )}

        {/* Latest Articles */}
        <div className={`bg-${theme === 'dark' ? 'gray-800' : 'white'} rounded-lg shadow-lg p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold text-${theme === 'dark' ? 'white' : 'gray-900'}`}>Latest Articles</h2>
            <Link 
              href="/articles" 
              className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors`}
            >
              View All Articles →
            </Link>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`h-24 bg-${theme === 'dark' ? 'gray-700' : 'gray-100'} rounded-lg`}></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {articles.slice(0, 5).map((article) => (
                <div 
                  key={article.id} 
                  className={`p-4 border border-${theme === 'dark' ? 'gray-700' : 'gray-200'} rounded-lg hover:bg-${theme === 'dark' ? 'gray-700/50' : 'gray-50'} transition-colors`}
                >
                  <h3 className={`text-lg font-semibold text-${theme === 'dark' ? 'white' : 'gray-900'} mb-2`}>
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`hover:text-blue-600 dark:hover:text-blue-400`}
                    >
                      {article.title}
                    </a>
                  </h3>
                  <div className="flex justify-between items-center text-sm text-${theme === 'dark' ? 'gray-400' : 'gray-500'}">
                    <span>
                      Source: {article.source} (
                      <a 
                        href={article.metadata.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        source link
                      </a>
                      )
                    </span>
                    <span>
                      {new Date(article.metadata.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {articles.length === 0 && (
                <div className={`text-center py-8 text-${theme === 'dark' ? 'gray-400' : 'gray-500'}`}>
                  No new articles found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Failed Sources */}
        {metrics && metrics.failedSources.length > 0 && (
          <div className={`mt-8 bg-${theme === 'dark' ? 'gray-800' : 'white'} rounded-lg shadow-lg p-6`}>
            <h2 className={`text-2xl font-bold text-${theme === 'dark' ? 'white' : 'gray-900'} mb-6`}>Failed Sources</h2>
            <div className="space-y-4">
              {metrics.failedSources.map((failure, index) => (
                <div 
                  key={index}
                  className={`p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg`}
                >
                  <p className={`font-medium text-red-800 dark:text-red-200`}>{failure.source}</p>
                  <p className={`text-sm text-red-600 dark:text-red-300 mt-1`}>{failure.error}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
