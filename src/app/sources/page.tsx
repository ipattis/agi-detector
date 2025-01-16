'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Source {
  id: string
  url: string
  contentHints: string | null
  crawlSchedule: string | null
  status: string
  lastError: string | null
  createdAt: string
  updatedAt: string
}

interface Entry {
  id: string
  sourceId: string
  title: string
  content: string
  hash: string
  metadata: any
  createdAt: string
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSources()
  }, [])

  useEffect(() => {
    if (selectedSource) {
      fetchEntries(selectedSource)
    }
  }, [selectedSource])

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources')
      if (!response.ok) throw new Error('Failed to fetch sources')
      const data = await response.json()
      setSources(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setLoading(false)
    }
  }

  const fetchEntries = async (sourceId: string) => {
    setLoadingEntries(true)
    try {
      const response = await fetch(`/api/sources/${sourceId}/entries`)
      if (!response.ok) throw new Error('Failed to fetch entries')
      const data = await response.json()
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries')
    } finally {
      setLoadingEntries(false)
    }
  }

  const retrySource = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/sources/${sourceId}/retry`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to retry source')
      await fetchSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry source')
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Crawling Sources
          </h1>
          <Link 
            href="/submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add New Source
          </Link>
        </div>

        <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-700">
            {sources.map((source) => (
              <li key={source.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-white truncate">
                        {source.url}
                      </h3>
                      <div className="mt-2 flex items-center text-sm text-gray-400">
                        <span className="truncate">
                          Status: {source.status}
                          {source.lastError && (
                            <span className="ml-2 text-red-500">
                              Error: {source.lastError}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setSelectedSource(source.id === selectedSource ? null : source.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-100 bg-indigo-900 hover:bg-indigo-800"
                      >
                        {source.id === selectedSource ? 'Hide Entries' : 'View Entries'}
                      </button>
                      {source.status === 'ERROR' && (
                        <button
                          onClick={() => retrySource(source.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>

                  {source.id === selectedSource && (
                    <div className="mt-4 border-t border-gray-700 pt-4">
                      <h4 className="text-lg font-medium text-white mb-4">
                        Crawled Entries
                      </h4>
                      {loadingEntries ? (
                        <div className="py-8">
                          <LoadingSpinner />
                        </div>
                      ) : entries.length === 0 ? (
                        <p className="text-gray-400">No entries found</p>
                      ) : (
                        <ul className="space-y-4">
                          {entries.map((entry) => (
                            <li key={entry.id} className="bg-gray-700 p-4 rounded-md">
                              <h5 className="text-md font-medium text-white">
                                {entry.title}
                              </h5>
                              <p className="mt-1 text-sm text-gray-300">
                                {entry.content.substring(0, 200)}...
                              </p>
                              <div className="mt-2 text-xs text-gray-400">
                                Crawled: {new Date(entry.createdAt).toLocaleString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
