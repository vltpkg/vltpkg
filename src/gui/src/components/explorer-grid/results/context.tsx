import { useEffect, useRef, useContext, createContext } from 'react'
import { useStore, createStore } from 'zustand'
import {
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router'
import { PAGE_SIZE_OPTIONS } from '@/components/explorer-grid/results/page-options.tsx'

import type { PropsWithChildren } from 'react'
import type { StoreApi } from 'zustand'
import type { PageSizeOption } from '@/components/explorer-grid/results/page-options.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.tsx'

export type ResultsSortBy =
  | 'alphabetical'
  | 'version'
  | 'dependencyType'
  | 'dependents'
  | 'moduleType'
  | 'overallScore'

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
  pageSize: PageSizeOption
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
    createStore<ResultsStore>((_, get) => ({
      page: Number(searchParams.get('page') ?? '1'),
      totalPages: 1,
      pageSize: Number(
        searchParams.get('pageSize') ??
          PAGE_SIZE_OPTIONS[0].toString(),
      ) as PageSizeOption,
      pageItems: [],
      allItems,
      sortBy: (() => {
        const raw = (searchParams.get('sort') ??
          'alphabetical') as ResultsSortBy
        const valid: ResultsSortBy[] = [
          'alphabetical',
          'version',
          'dependencyType',
          'dependents',
          'moduleType',
          'overallScore',
        ]
        return valid.includes(raw) ? raw : 'alphabetical'
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
        next.set('sort', sortBy)
        setSearchParams(next, { replace: true })
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
        next.set('pageSize', PAGE_SIZE_OPTIONS[0].toString())
        setSearchParams(next, { replace: true })
      }
    }
  }, [allItems, pathname, navigate, searchParams, setSearchParams])

  // keep store in sync with URL and data; clamp and validate values
  useEffect(() => {
    const defaultPageSize = PAGE_SIZE_OPTIONS[0]
    const rawPageSize = Number(
      searchParams.get('pageSize') ?? String(defaultPageSize),
    )
    const validPageSize =
      (
        (PAGE_SIZE_OPTIONS as unknown as number[]).includes(
          rawPageSize,
        )
      ) ?
        rawPageSize
      : defaultPageSize

    const totalPages = Math.max(
      1,
      Math.ceil(allItems.length / Math.max(1, validPageSize)),
    )

    const rawPage = Number(searchParams.get('page') ?? '1')
    const clampedPage = Math.min(Math.max(rawPage, 1), totalPages)

    const rawSort = (searchParams.get('sort') ??
      'alphabetical') as ResultsSortBy
    const validSorts: ResultsSortBy[] = [
      'alphabetical',
      'version',
      'dependencyType',
      'dependents',
      'moduleType',
      'overallScore',
    ]
    const sortBy =
      validSorts.includes(rawSort) ? rawSort : 'alphabetical'

    const start = (clampedPage - 1) * validPageSize
    const pageSlice = allItems.slice(start, start + validPageSize)

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

    const pageItems = [...pageSlice].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return compareString(a.name, b.name)
        case 'version': {
          const va = a.version
          const vb = b.version
          return compareString(va, vb)
        }
        case 'dependencyType':
          return compareString(a.type, b.type)
        case 'dependents':
          return compareNumber(a.size, b.size, true)
        case 'moduleType': {
          const ma = a.to?.manifest?.type ?? ''
          const mb = b.to?.manifest?.type ?? ''
          return compareString(ma, mb)
        }
        case 'overallScore': {
          const scoreA = a.to?.insights.score
          const scoreB = b.to?.insights.score
          const sa = scoreA ? scoreA.overall : null
          const sb = scoreB ? scoreB.overall : null
          return compareNumber(sa, sb, true)
        }
      }
    })

    // reflect clamped/validated values in URL if needed
    if (
      rawPage !== clampedPage ||
      rawPageSize !== validPageSize ||
      rawSort !== sortBy
    ) {
      const next = new URLSearchParams(searchParams)
      next.set('page', String(clampedPage))
      next.set('pageSize', String(validPageSize))
      next.set('sort', sortBy)
      setSearchParams(next, { replace: true })
    }

    resultsStore.setState({
      page: clampedPage,
      pageSize: validPageSize as PageSizeOption,
      totalPages,
      pageItems,
      allItems,
      sortBy,
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
