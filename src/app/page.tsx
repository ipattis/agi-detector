'use client';

import React, { useState, useEffect } from 'react';
import CrawlMetrics from '@/components/CrawlMetrics';

interface CrawlResult {
  id: string;
  title: string;
  url: string;
  content: string;
  metadata: {
    source: string;
    timestamp: string;
  };
}

interface AnalysisResult {
  id: string;
  score: number;
  confidence: number;
  indicators: string[];
  explanation: string;
}

const MONITORED_SOURCES = [
  { id: 'openai', name: 'OpenAI Blog' },
  { id: 'deepmind', name: 'DeepMind Research' },
  { id: 'anthropic', name: 'Anthropic Updates' },
  { id: 'microsoft', name: 'Microsoft AI News' },
  { id: 'ibm', name: 'IBM Research Blog' },
];

const MONITORED_INDICATORS = [
  { id: 'perf-leaps', text: 'Unexplained AI performance leaps' },
  { id: 'self-improve', text: 'Self-improvement capabilities' },
  { id: 'cross-domain', text: 'Cross-domain knowledge transfer' },
  { id: 'autonomous', text: 'Autonomous behavior patterns' },
];

const KEY_SOURCES = [
  { id: 'openai', text: 'OpenAI Blog' },
  { id: 'deepmind', text: 'DeepMind Research' },
  { id: 'anthropic', text: 'Anthropic Updates' },
  { id: 'microsoft', text: 'Microsoft AI Research' },
];

// Add a function to check if it's time for the daily crawl
const shouldRunDailyCrawl = (lastRunTime: string | null): boolean => {
  if (!lastRunTime) return true;
  
  const lastRun = new Date(lastRunTime);
  const now = new Date();
  
  // Check if it's been 24 hours since the last run
  return now.getTime() - lastRun.getTime() >= 24 * 60 * 60 * 1000;
};

export default function Home(): React.ReactElement {
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoCrawling, setIsAutoCrawling] = useState(false);
  const [lastCrawlTime, setLastCrawlTime] = useState<string | null>(null);
  const [nextScheduledCrawl, setNextScheduledCrawl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to format dates
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const analyzeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setAnalyses(prev => [...prev, data.data]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    }
    setIsLoading(false);
  };

  const startCrawling = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/crawl', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start crawling');
      }
      
      // Update crawl results
      setCrawlResults(data.data || []);
      setLastCrawlTime(new Date().toISOString());
      
    } catch (err) {
      console.error('Error during crawl:', err);
      setError(err instanceof Error ? err.message : 'Failed to start crawling');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAutoCrawling) {
      const now = new Date();
      const nextCrawl = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
      setNextScheduledCrawl(nextCrawl.toISOString());
      
      const timer = setInterval(async () => {
        await startCrawling();
        const newNextCrawl = new Date(new Date().getTime() + 15 * 60 * 1000);
        setNextScheduledCrawl(newNextCrawl.toISOString());
      }, 15 * 60 * 1000); // 15 minutes
      
      return () => clearInterval(timer);
    }
  }, [isAutoCrawling]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">AGI Detector</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            An advanced monitoring system designed to detect early signs of Artificial General Intelligence (AGI) by analyzing patterns across multiple domains.
          </p>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔍 Comprehensive Monitoring</h3>
              <p className="text-blue-800 dark:text-blue-200">Tracks AI research papers, news sites, company blogs, and social media for breakthrough indicators</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">🧠 Advanced Analysis</h3>
              <p className="text-purple-800 dark:text-purple-200">Uses NLP to analyze content for signs of AI self-improvement, cross-domain learning, and autonomous behavior</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">⚡ Real-time Alerts</h3>
              <p className="text-green-800 dark:text-green-200">Instant notifications for significant developments or anomalous patterns in AI advancement</p>
            </div>
          </div>

          {/* Indicators and Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Monitored Indicators</h3>
              <ul className="space-y-2">
                {MONITORED_INDICATORS.map(indicator => (
                  <li key={indicator.id} className="flex items-center text-gray-700 dark:text-gray-300">
                    <span className="mr-2">•</span>
                    {indicator.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Key Sources</h3>
              <ul className="space-y-2">
                {KEY_SOURCES.map(source => (
                  <li key={source.id} className="flex items-center text-gray-700 dark:text-gray-300">
                    <span className="mr-2">•</span>
                    {source.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sources Monitored</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{crawlResults.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Potential Indicators</h3>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analyses.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AGI Likelihood Assessment</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {analyses.length > 0 ? 'Medium' : 'Low'}
            </p>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <CrawlMetrics />
        
        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Control Panel</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setIsAutoCrawling(!isAutoCrawling)}
                  className={`px-6 py-3 rounded-lg font-semibold text-white shadow-lg transition-all ${
                    isAutoCrawling 
                      ? 'bg-red-500 hover:bg-red-600 active:bg-red-700' 
                      : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                  }`}
                >
                  {isAutoCrawling ? 'Stop Auto-Crawling' : 'Start Auto-Crawling'}
                </button>
                <button
                  onClick={startCrawling}
                  disabled={isLoading || isAutoCrawling}
                  className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Manual Crawl'}
                </button>
                <button
                  onClick={analyzeData}
                  disabled={isLoading || crawlResults.length === 0}
                  className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyze Data
                </button>
              </div>
            </div>

            {/* Status Information */}
            <div className="space-y-3">
              {lastCrawlTime && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Last crawl:</span>{' '}
                    {formatDateTime(new Date(lastCrawlTime))}
                  </p>
                </div>
              )}
              {isAutoCrawling && nextScheduledCrawl && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200">
                    <span className="font-medium">Next scheduled crawl:</span>{' '}
                    {formatDateTime(new Date(nextScheduledCrawl))}
                  </p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>

            {/* Results */}
            {crawlResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Latest Results</h2>
                <div className="space-y-4">
                  {crawlResults.map((result) => (
                    <div key={result.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{result.title}</h3>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                        {result.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
