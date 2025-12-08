import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import { useGraphStore } from '@/state/index.ts'
import {
  encodeCompressedQuery,
  decodeCompressedQuery,
} from '@/lib/compress-query.ts'

/**
 * A hook that synchronizes the query state in zustand with the URL.
 */
export const useQueryNavigation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { query: encodedQueryURL } = useParams<{ query: string }>()

  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)

  // Skip query navigation for npm package routes
  const isNpmRoute = location.pathname.startsWith('/explore/npm/')

  /**
   * Prevent navigation loops between:
   * url -> zustand -> url
   *
   * Setting this flag tells the next effect:
   * 'this change came from the url; don't navigate again.'
   */
  const skipNextNavigation = useRef(false)

  /**
   * Runs when the `encodedQueryURL` changes.
   *
   * If `encodedQueryURL` is present, decode the compressed `encodedQueryURL` and if it's
   * different from the current query in zustand, set `skipNextNavigation`
   * and call `updateQuery` to update the query in zustand
   */
  useEffect(() => {
    if (isNpmRoute) return // Skip for npm routes

    if (encodedQueryURL) {
      const decodedQueryURL = decodeCompressedQuery(encodedQueryURL)
      if (decodedQueryURL !== query) {
        skipNextNavigation.current = true
        updateQuery(decodedQueryURL)
      }
    }
  }, [encodedQueryURL, updateQuery, isNpmRoute]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Runs when the zustand query or some routing parameters change.
   *
   * If `skipNextNavigation` is set, clears the flag and
   * returns early preventing navigation.
   *
   * Otherwise if the `query` is present, encode it and if it's different from
   * `encodedQueryURL`, navigate to the new URL with the encoded query.
   *
   * This keeps the url updated when the query changes in zustand.
   */
  useEffect(() => {
    if (isNpmRoute) return // Skip for npm routes

    if (skipNextNavigation.current) {
      skipNextNavigation.current = false
      return
    }

    if (query) {
      const encodedQuery = encodeCompressedQuery(query)
      if (encodedQuery !== encodedQueryURL) {
        // Always navigate to 'overview' when query changes (navigating to new item)
        void navigate(`/explore/${encodedQuery}/overview`, {
          relative: 'path',
        })
      }
    }
  }, [
    query,
    navigate,
    location.pathname,
    encodedQueryURL,
    isNpmRoute,
  ])
}
