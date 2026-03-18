import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

import type { SearchResult } from '@/types'

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
      setResults([])
      setLoading(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)

      try {
        const searchResults = await invoke<SearchResult[]>('search_notes', {
          query: normalizedQuery,
        })
        setResults(searchResults)
      } catch (error) {
        console.error(error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 140)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query])

  return { results, loading }
}
