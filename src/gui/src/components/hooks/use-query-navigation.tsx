import { useEffect, useRef } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { useNavigate, useParams, useLocation } from 'react-router'
import {
  encodeCompressedQuery,
  decodeCompressedQuery,
} from '@/lib/compress-query.ts'

export const useQueryNavigation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    query: encodedQueryURL,
    tab,
    subTab,
  } = useParams<{ query: string; tab: string; subTab?: string }>()
  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)

  // Track when we're updating from URL to prevent navigation loops
  const skipNextNavigation = useRef(false)

  useEffect(() => {
    if (encodedQueryURL) {
      const decodedQueryURL = decodeCompressedQuery(encodedQueryURL)
      if (decodedQueryURL !== query) {
        skipNextNavigation.current = true
        updateQuery(decodedQueryURL)
      }
    }
  }, [encodedQueryURL, updateQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipNextNavigation.current) {
      skipNextNavigation.current = false
      return
    }

    if (query) {
      const encodedQuery = encodeCompressedQuery(query)
      if (encodedQuery !== encodedQueryURL) {
        void navigate(`/explore/${encodedQuery}`, {
          relative: 'path',
        })
      }
    }
  }, [
    query,
    navigate,
    location.pathname,
    tab,
    subTab,
    encodedQueryURL,
  ])
}
