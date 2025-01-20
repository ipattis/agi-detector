'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Entry {
  id: string
  title: string | null
  content: string
  createdAt: string
}

interface Source {
  id: string
  url: string
  status: string
  lastError: string | null
  createdAt: string
  entries: Entry[]
}

export default function SourcePage() {
  const params = useParams()
  const [source, setSource] = useState<Source | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSource = async () => {
      try {
        const response = await fetch(`/api/sources/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch source')
        }
        const data = await response.json()
        setSource(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSource()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-500 text-white p-4 rounded">
          Error: {error}
        </div>
      </div>
    )
  }

  if (!source) {
    return (
      <div className="p-4">
        <div className="bg-yellow-500 text-white p-4 rounded">
          Source not found
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Source Details</h1>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-400">URL</p>
            <a href={source.url} target="_blank" rel="noopener noreferrer" 
               className="text-blue-400 hover:text-blue-300 break-all">
              {source.url}
            </a>
          </div>
          <div>
            <p className="text-gray-400">Status</p>
            <span className={`inline-block px-2 py-1 rounded ${
              source.status === 'active' ? 'bg-green-500' :
              source.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`}>
              {source.status}
            </span>
          </div>
          <div>
            <p className="text-gray-400">Created At</p>
            <p>{new Date(source.createdAt).toLocaleString()}</p>
          </div>
          {source.lastError && (
            <div>
              <p className="text-gray-400">Last Error</p>
              <p className="text-red-400">{source.lastError}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Entries ({source.entries.length})</h2>
        <div className="space-y-4">
          {source.entries.map((entry) => (
            <div key={entry.id} className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">{entry.title || 'Untitled'}</h3>
              <p className="text-gray-300 mb-2">{entry.content}</p>
              <p className="text-sm text-gray-400">
                Added: {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {source.entries.length === 0 && (
            <p className="text-gray-400">No entries found</p>
          )}
        </div>
      </div>
    </div>
  )
}
