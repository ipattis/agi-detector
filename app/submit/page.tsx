'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function SubmitPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [contentHints, setContentHints] = useState('')
  const [schedule, setSchedule] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          contentHints,
          crawlSchedule: schedule || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit URL')
      }

      router.push('/sources')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800 shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-3xl font-bold text-white mb-8">
                Submit URL for Crawling
              </h1>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-300">
                    URL
                  </label>
                  <div className="mt-1">
                    <input
                      type="url"
                      id="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="https://example.com/blog"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="hints" className="block text-sm font-medium text-gray-300">
                    Content Hints
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="hints"
                      value={contentHints}
                      onChange={(e) => setContentHints(e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="E.g., 'Main content is in .article-content, ignore sidebar'"
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Optional hints to help locate the main content on the page
                  </p>
                </div>

                <div>
                  <label htmlFor="schedule" className="block text-sm font-medium text-gray-300">
                    Crawl Schedule
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="schedule"
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="*/30 * * * * (every 30 minutes)"
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Optional cron expression for scheduled crawls
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-900/50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-400">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-300">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span>Submitting...</span>
                      </div>
                    ) : (
                      'Submit URL'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
