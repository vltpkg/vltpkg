import { useEffect, useRef, useContext, createContext } from 'react'
import { useStore, createStore } from 'zustand'
import {
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router'

import type { PropsWithChildren } from 'react'
import type { StoreApi } from 'zustand'
import type { GridItemData } from '@/components/explorer-grid/types.tsx'

export type ResultsSortBy =
  | 'none'
  | 'alphabetical'
  | 'version'
  | 'dependencyType'
  | 'dependents'
  | 'moduleType'

export type ResultsSortDir = 'asc' | 'desc'

/**
 * Client-side sorting function for explorer grid results
 * Matches the pattern used in search-results.ts
 */
const sortResults = (
  results: GridItemData[],
  sortBy: ResultsSortBy,
  sortDir: ResultsSortDir,
): GridItemData[] => {
  if (sortBy === 'none') {
    return results
  }

  const compareString = (x?: string, y?: string) =>
    (x ?? '').localeCompare(y ?? '', undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  const compareNumber = (
    x?: number | null,
    y?: number | null,
    desc = false,
  ) => {
    const nx = x ?? -Infinity
    const ny = y ?? -Infinity
    return desc ? ny - nx : nx - ny
  }

  const sorted = [...results].sort((a, b) => {
    const dirMultiplier = sortDir === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'alphabetical':
        return dirMultiplier * compareString(a.name, b.name)
      case 'version': {
        const va = a.version
        const vb = b.version
        return dirMultiplier * compareString(va, vb)
      }
      case 'dependencyType':
        return dirMultiplier * compareString(a.type, b.type)
      case 'dependents':
        return compareNumber(a.size, b.size, sortDir === 'desc')
      case 'moduleType': {
        const ma = a.to?.manifest?.type ?? ''
        const mb = b.to?.manifest?.type ?? ''
        return dirMultiplier * compareString(ma, mb)
      }
    }
  })

  return sorted
}

type ResultsStoreState = {
  /**
   * The current page number
   */
  page: number
  /**
   * The total number of pages
   */
  totalPages: number
  /**
   * The count of items on each page
   */
  pageSize: number
  /**
   * The items to display on the current page
   */
  pageItems: GridItemData[]
  /**
   * A collection of all the items available
   */
  allItems: GridItemData[]
  /**
   * Current sort key for list view
   */
  sortBy: ResultsSortBy
  /**
   * Current sort direction for list view
   */
  sortDir: ResultsSortDir
}

type ResultsStoreAction = {
  /**
   * Sets the current page
   */
  setPage: (page: ResultsStoreState['page']) => void
  /**
   * Sets the count of items on each page
   */
  setPageSize: (pageSize: ResultsStoreState['pageSize']) => void
  /**
   * Sets the sort key for the results list
   */
  setSortBy: (sortBy: ResultsSortBy) => void
  /**
   * Sets the sort direction for the results list
   */
  setSortDir: (sortDir: ResultsSortDir) => void
  /**
   * Sets both sort key and direction atomically
   */
  setSort: (sortBy: ResultsSortBy, sortDir: ResultsSortDir) => void
}

export type ResultsStore = ResultsStoreState & ResultsStoreAction

interface ResultsProviderProps extends PropsWithChildren {
  allItems: ResultsStoreState['allItems']
}

const ResultsContext = createContext<
  StoreApi<ResultsStore> | undefined
>(undefined)

export const ResultsProvider = ({
  children,
  allItems,
}: ResultsProviderProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { pathname } = useLocation()

  const latestSearchParamsRef = useRef(searchParams)
  useEffect(() => {
    latestSearchParamsRef.current = searchParams
  }, [searchParams])

  const resultsStore = useRef(
    createStore<ResultsStore>((set, get) => ({
      page: Number(searchParams.get('page') ?? '1'),
      totalPages: 1,
      pageSize: 25,
      pageItems: [],
      allItems,
      sortBy: (() => {
        const raw = (searchParams.get('sort') ??
          'none') as ResultsSortBy
        const valid: ResultsSortBy[] = [
          'none',
          'alphabetical',
          'version',
          'dependencyType',
          'dependents',
          'moduleType',
        ]
        return valid.includes(raw) ? raw : 'none'
      })(),
      sortDir: (() => {
        const sortByParam = (searchParams.get('sort') ??
          'none') as ResultsSortBy
        const dirParam = searchParams.get('dir') ?? ''
        const validSorts: ResultsSortBy[] = [
          'none',
          'alphabetical',
          'version',
          'dependencyType',
          'dependents',
          'moduleType',
        ]
        const sortBy =
          validSorts.includes(sortByParam) ? sortByParam : 'none'
        const defaultDirFor = (key: ResultsSortBy): ResultsSortDir =>
          key === 'dependents' ? 'desc' : 'asc'
        return dirParam === 'asc' || dirParam === 'desc' ?
            dirParam
          : defaultDirFor(sortBy)
      })(),
      setPage: (page: ResultsStoreState['page']) => {
        const next = new URLSearchParams(
          latestSearchParamsRef.current,
        )
        next.set('page', String(page))
        // keep current pageSize; if missing, use the store's current value
        if (!next.get('pageSize')) {
          next.set('pageSize', String(get().pageSize))
        }
        setSearchParams(next, { replace: true })
      },
      setPageSize: (pageSize: ResultsStoreState['pageSize']) => {
        const next = new URLSearchParams(
          latestSearchParamsRef.current,
        )
        next.set('pageSize', String(pageSize))
        // reset page to 1 when page size changes
        next.set('page', '1')
        setSearchParams(next, { replace: true })
      },
      setSortBy: (sortBy: ResultsSortBy) => {
        const next = new URLSearchParams(
          latestSearchParamsRef.current,
        )
        if (sortBy === 'none') {
          next.delete('sort')
        } else {
          next.set('sort', sortBy)
        }
        // when changing sort key, reset direction to sensible default for that key
        const defaultDirFor = (key: ResultsSortBy): ResultsSortDir =>
          key === 'dependents' ? 'desc' : 'asc'
        const newSortDir =
          sortBy === 'none' ? 'asc' : defaultDirFor(sortBy)
        if (sortBy === 'none') {
          next.delete('dir')
        } else {
          next.set('dir', newSortDir)
        }
        setSearchParams(next, { replace: true })

        // Immediately re-sort existing results (optimization: don't wait for URL sync)
        const { allItems, pageSize, page } = get()
        if (allItems.length > 0) {
          const sortedAll = sortResults(allItems, sortBy, newSortDir)
          const start = (page - 1) * pageSize
          const pageItems = sortedAll.slice(start, start + pageSize)
          const totalPages = Math.max(
            1,
            Math.ceil(sortedAll.length / pageSize),
          )
          set({
            sortBy,
            sortDir: newSortDir,
            pageItems,
            totalPages,
          })
        }
      },
      setSortDir: (sortDir: ResultsSortDir) => {
        const next = new URLSearchParams(
          latestSearchParamsRef.current,
        )
        next.set('dir', sortDir)
        setSearchParams(next, { replace: true })

        // Immediately re-sort existing results (optimization: don't wait for URL sync)
        const { allItems, sortBy, pageSize, page } = get()
        if (allItems.length > 0) {
          const sortedAll = sortResults(allItems, sortBy, sortDir)
          const start = (page - 1) * pageSize
          const pageItems = sortedAll.slice(start, start + pageSize)
          set({
            sortDir,
            pageItems,
          })
        }
      },
      setSort: (sortBy: ResultsSortBy, sortDir: ResultsSortDir) => {
        const next = new URLSearchParams(
          latestSearchParamsRef.current,
        )
        if (sortBy === 'none') {
          next.delete('sort')
          next.delete('dir')
        } else {
          next.set('sort', sortBy)
          next.set('dir', sortDir)
        }
        // reset page to 1 when sorting changes
        next.set('page', '1')
        setSearchParams(next, { replace: true })

        // Immediately re-sort existing results (optimization: don't wait for URL sync)
        const { allItems, pageSize } = get()
        if (allItems.length > 0) {
          const sortedAll = sortResults(allItems, sortBy, sortDir)
          const pageItems = sortedAll.slice(0, pageSize)
          const totalPages = Math.max(
            1,
            Math.ceil(sortedAll.length / pageSize),
          )
          set({
            sortBy,
            sortDir,
            page: 1,
            pageItems,
            totalPages,
          })
        }
      },
    })),
  ).current

  /**
   * When new `items` are available: we assume there are results,
   * and we navigate to `.../<encodedUrlQuery>?page=1`
   */
  useEffect(() => {
    // only run this logic when we actually have a result set that implies “list view”
    // i.e., more than one item. Skip while loading (length === 0) and skip the single-item case.
    if (allItems.length > 1) {
      // remove trailing "/overview" (with or without trailing slash)
      const newPath = pathname.replace(/\/overview\/?$/, '')

      // only navigate if path is actually changing
      if (newPath !== pathname) {
        void navigate(newPath, { replace: true }) // avoid history spam
      }

      // ensure page=1 is present; clone instead of mutating in place
      if (!searchParams.get('page')) {
        const next = new URLSearchParams(searchParams)
        next.set('page', '1')
        next.set('pageSize', '25')
        setSearchParams(next, { replace: true })
      }
    }
  }, [allItems, pathname, navigate, searchParams, setSearchParams])

  // keep store in sync with URL and data; clamp and validate values
  useEffect(() => {
    const defaultPageSize = 25
    const rawPageSize = Number(
      searchParams.get('pageSize') ?? String(defaultPageSize),
    )
    const validPageSize = 25

    const totalPages = Math.max(
      1,
      Math.ceil(allItems.length / Math.max(1, validPageSize)),
    )

    const rawPage = Number(searchParams.get('page') ?? '1')
    const clampedPage = Math.min(Math.max(rawPage, 1), totalPages)

    const rawSort = (searchParams.get('sort') ??
      'none') as ResultsSortBy
    const validSorts: ResultsSortBy[] = [
      'none',
      'alphabetical',
      'version',
      'dependencyType',
      'dependents',
      'moduleType',
    ]
    const sortBy = validSorts.includes(rawSort) ? rawSort : 'none'

    const rawDir = searchParams.get('dir') ?? ''
    const defaultDirFor = (key: ResultsSortBy): ResultsSortDir =>
      key === 'dependents' ? 'desc' : 'asc'
    const sortDir: ResultsSortDir =
      sortBy === 'none' ? 'asc'
      : rawDir === 'asc' || rawDir === 'desc' ? rawDir
      : defaultDirFor(sortBy)

    // Sort the entire array first, then paginate (matches search-results.ts pattern)
    const sortedAll = sortResults(allItems, sortBy, sortDir)

    // Paginate the sorted results
    const start = (clampedPage - 1) * validPageSize
    const pageItems = sortedAll.slice(start, start + validPageSize)

    // reflect clamped/validated values in URL if needed
    // When sortBy is 'none', don't compare sortDir since we're going to delete it anyway
    const needsSync =
      sortBy === 'none' ?
        rawPage !== clampedPage ||
        rawPageSize !== validPageSize ||
        rawSort !== sortBy
      : rawPage !== clampedPage ||
        rawPageSize !== validPageSize ||
        rawSort !== sortBy ||
        rawDir !== sortDir

    if (needsSync) {
      const next = new URLSearchParams(searchParams)
      next.set('page', String(clampedPage))
      next.set('pageSize', String(validPageSize))
      if (sortBy === 'none') {
        next.delete('sort')
        next.delete('dir')
      } else {
        next.set('sort', sortBy)
        next.set('dir', sortDir)
      }
      setSearchParams(next, { replace: true })
    }

    resultsStore.setState({
      page: clampedPage,
      pageSize: validPageSize,
      totalPages,
      pageItems,
      allItems,
      sortBy,
      sortDir,
    })
  }, [allItems, searchParams, resultsStore, setSearchParams])

  return (
    <ResultsContext.Provider value={resultsStore}>
      {children}
    </ResultsContext.Provider>
  )
}

export const useResultsStore = <T,>(
  selector: (state: ResultsStore) => T,
) => {
  const store = useContext(ResultsContext)
  if (!store) {
    throw new Error(
      'useResultsStore must be used within a ResultsProvider',
    )
  }
  return useStore(store, selector)
}
