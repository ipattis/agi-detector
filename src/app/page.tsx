'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Source {
  id: string
  url: string
  status: string
  lastError: string | null
  createdAt: string
  entries: Entry[]
}

interface Entry {
  id: string
  title: string | null
  content: string
  createdAt: string
}

interface DashboardStats {
  totalSources: number
  activeSources: number
  errorSources: number
  totalEntries: number
  recentEntries: Entry[]
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/sources')
      if (!response.ok) throw new Error('Failed to fetch sources')
      const sources: Source[] = await response.json()

      // Calculate stats
      const totalSources = sources.length
      const activeSources = sources.filter(s => s.status === 'ACTIVE').length
      const errorSources = sources.filter(s => s.status === 'ERROR').length
      const totalEntries = sources.reduce((sum, source) => sum + source.entries.length, 0)
      
      // Get recent entries
      const allEntries = sources.flatMap(source => 
        source.entries.map(entry => ({
          ...entry,
          sourceUrl: source.url
        }))
      )
      const recentEntries = allEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

      setStats({
        totalSources,
        activeSources,
        errorSources,
        totalEntries,
        recentEntries
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add New Source
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Total Sources</dt>
                    <dd className="text-lg font-medium text-white">{stats?.totalSources}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Active Sources</dt>
                    <dd className="text-lg font-medium text-white">{stats?.activeSources}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Error Sources</dt>
                    <dd className="text-lg font-medium text-white">{stats?.errorSources}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Total Entries</dt>
                    <dd className="text-lg font-medium text-white">{stats?.totalEntries}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-white mb-4">Recent Entries</h2>
            {stats?.recentEntries && stats.recentEntries.length > 0 ? (
              <div className="space-y-4">
                {stats.recentEntries.map((entry) => (
                  <div key={entry.id} className="bg-gray-700 p-4 rounded-md">
                    <h3 className="text-md font-medium text-white">
                      {entry.title || 'Untitled Entry'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-300">
                      {entry.content.substring(0, 200)}...
                    </p>
                    <div className="mt-2 text-xs text-gray-400">
                      Crawled: {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No entries found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
