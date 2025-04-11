import React, {
  useEffect,
  useState,
  createContext,
  useContext,
} from 'react'
import { useGraphStore } from '@/state/index.js'
import { Query } from '@vltpkg/query'
import type { ParsedSelectorToken } from '@vltpkg/query'
import type { State, Action } from '@/state/types.js'

interface QueryBarContextValue {
  query: State['query']
  updateQuery: Action['updateQuery']
  q: State['q']
  parsedTokens: ParsedSelectorToken[]
  setParsedTokens: React.Dispatch<
    React.SetStateAction<ParsedSelectorToken[]>
  >
  queryError: State['queryError']
  setQueryError: Action['updateQueryError']
}

const QueryBarContext = createContext<
  QueryBarContextValue | undefined
>(undefined)

export const QueryBarProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const queryError = useGraphStore(state => state.queryError)
  const setQueryError = useGraphStore(state => state.updateQueryError)
  const q = useGraphStore(state => state.q)

  const [parsedTokens, setParsedTokens] = useState<
    ParsedSelectorToken[]
  >([])

  useEffect(() => {
    if (!q || !query) {
      setParsedTokens([])
      return
    }
    try {
      const tokens = Query.parse(query)
      setParsedTokens(tokens)
    } catch (error) {
      console.error(`Error parsing query: ${error}`)
    }
  }, [query, q])

  return (
    <QueryBarContext.Provider
      value={{
        query,
        updateQuery,
        q,
        parsedTokens,
        setParsedTokens,
        queryError,
        setQueryError,
      }}>
      {children}
    </QueryBarContext.Provider>
  )
}

export const useQueryBar = () => {
  const context = useContext(QueryBarContext)
  if (!context) {
    throw new Error(
      'useQueryBar must be used within a QueryBarProvider',
    )
  }
  return context
}
