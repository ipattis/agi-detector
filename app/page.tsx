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
  sourceId: string
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
          sourceId: source.id
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Sources</h3>
            <p className="text-3xl font-bold">{stats?.totalSources || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Active Sources</h3>
            <p className="text-3xl font-bold text-green-500">{stats?.activeSources || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Error Sources</h3>
            <p className="text-3xl font-bold text-red-500">{stats?.errorSources || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Total Entries</h3>
            <p className="text-3xl font-bold">{stats?.totalEntries || 0}</p>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Recent Entries</h2>
            <Link href="/submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Add New Source
            </Link>
          </div>
          <div className="space-y-4">
            {stats?.recentEntries.map((entry) => (
              <Link 
                key={entry.id} 
                href={`/sources/${entry.sourceId}`}
                className="block border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <h3 className="text-lg font-semibold mb-2">{entry.title || 'Untitled'}</h3>
                <p className="text-gray-300 mb-2">{entry.content}</p>
                <p className="text-sm text-gray-400">
                  Added: {new Date(entry.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
