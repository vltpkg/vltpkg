import { createContext, useContext, useRef, useEffect } from 'react'
import { useStore, createStore } from 'zustand'
import { hydrate } from '@vltpkg/dep-id/browser'
import { useGraphStore } from '@/state/index.ts'
import { fetchDetails } from '@/lib/external-info.ts'
import type { DetailsInfo } from '@/lib/external-info.ts'
import { PSEUDO_SECURITY_SELECTORS } from '@/lib/constants/index.ts'
import { generatePath, useNavigate, useParams } from 'react-router'
import type { Spec } from '@vltpkg/spec/browser'
import { isHostedEnvironment } from '@/lib/environment.ts'

import type {
  SocketCategory,
  SocketSecurityDetails,
  SocketSeverity,
} from '@/lib/constants/index.ts'
import type { StoreApi } from 'zustand'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type {
  Insights,
  QueryResponseNode,
  LicenseInsights,
} from '@vltpkg/query'
import type { PropsWithChildren } from 'react'
import type { PackageScore } from '@vltpkg/security-archive'
import type {
  NormalizedManifest,
  NormalizedFunding,
} from '@vltpkg/types'
import type { State } from '@/state/types.ts'

export type Tab =
  | 'overview'
  | 'insights'
  | 'versions'
  | 'json'
  | 'code'
  | 'dependencies'
  | 'contributors'

export type SubTabDependencies =
  | 'insights'
  | 'licenses'
  | 'funding'
  | 'duplicates'

const hostedMode = isHostedEnvironment()

/**
 * Top level or `primary` navigation layer of the selected item.
 *
 * When the application is deployed in a hosted environment we only show
 * a selected subset of the tabs available until features are integrated.
 */
export const PRIMARY_TABS: Partial<Record<Tab, string>> =
  hostedMode ?
    {
      overview: 'Overview',
      versions: 'Versions',
    }
  : {
      overview: 'Overview',
      json: 'JSON',
      code: 'Code',
      insights: 'Insights',
      versions: 'Versions',
      dependencies: 'Dependencies',
    }

/**
 * Second level or `secondary` navigation layer of the selected item
 */
export const SECONDARY_TABS: Partial<
  Record<SubTabDependencies, string>
> = {
  insights: 'Insights',
  licenses: 'Licenses',
  duplicates: 'Duplicates',
  funding: 'Funding',
}

export type LicenseWarningType = keyof LicenseInsights

export type DepFunding = Record<
  string,
  {
    url: string
    type: string | undefined
    count: number
  }
>

export type DepLicenses = {
  allLicenses: Record<string, number>
  byWarning: Record<
    LicenseWarningType,
    {
      licenses: string[]
      count: number
      severity: SocketSeverity
    }
  >
  totalCount: number
}

export type DepWarning = {
  selector: string
  severity: SocketSeverity
  description: string
  category: SocketCategory
  count: number
}

export type DuplicatedDeps = Record<
  string,
  {
    count: number
    versions: string[]
  }
>

const getSocketInsights = (
  insights?: Insights,
): SocketSecurityDetails[] | undefined => {
  if (!insights?.scanned) return

  const results: SocketSecurityDetails[] = []

  Object.entries(insights).forEach(([key, value]) => {
    if (key === 'scanned') return
    if (typeof value === 'boolean' && value) {
      const selector =
        PSEUDO_SECURITY_SELECTORS[
          `:${key}` as keyof typeof PSEUDO_SECURITY_SELECTORS
        ]
      if ('severity' in selector && 'securityCategory' in selector) {
        results.push({
          selector: selector.selector,
          severity: selector.severity,
          description: selector.description,
          category: selector.securityCategory,
        })
      }
    } else if (typeof value === 'object') {
      const parentInsight =
        PSEUDO_SECURITY_SELECTORS[
          `:${key}` as keyof typeof PSEUDO_SECURITY_SELECTORS
        ]
      if (
        key !== 'score' &&
        key !== 'cve' &&
        key !== 'cwe' &&
        key !== 'severity' &&
        'arguments' in parentInsight
      ) {
        Object.entries(value as Record<string, boolean>)
          .filter(([, subValue]) => subValue)
          .forEach(([subKey]) => {
            const argumentDetail = parentInsight.arguments.find(
              arg => arg.argument === subKey,
            )
            if (argumentDetail) {
              results.push({
                selector: `:${key}(${argumentDetail.argument})`,
                severity: argumentDetail.severity,
                description: argumentDetail.description,
                category: parentInsight.securityCategory,
              })
            }
          })
      }
    }
  })

  return results
}

export const getLicenseSeverity = (
  warningType: LicenseWarningType,
): SocketSeverity => {
  const licenseSelector = PSEUDO_SECURITY_SELECTORS[':license']

  const licenseArgument = licenseSelector.arguments.find(
    arg => arg.argument === warningType,
  )

  if (!licenseArgument?.severity) {
    throw new Error(
      `No severity found for license warning type: ${warningType}`,
    )
  }

  return licenseArgument.severity
}

const initializeCounters = () => ({
  depLicenses: {
    allLicenses: {},
    byWarning: {
      unlicensed: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('unlicensed'),
      },
      misc: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('misc'),
      },
      restricted: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('restricted'),
      },
      ambiguous: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('ambiguous'),
      },
      copyleft: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('copyleft'),
      },
      unknown: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('unknown'),
      },
      none: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('none'),
      },
      exception: {
        licenses: [],
        count: 0,
        severity: getLicenseSeverity('exception'),
      },
    },
    totalCount: 0,
  } as DepLicenses,
  averageScore: { score: 0, count: 0 },
  scannedDeps: 0,
  totalDepCount: 0,
  depWarnings: new Map<string, DepWarning>(),
  duplicatedDeps: {} as DuplicatedDeps,
  depFunding: {} as DepFunding,
})

const processInsights = (
  insights: Insights,
  depWarnings: Map<string, DepWarning>,
) => {
  const securityDetails = getSocketInsights(insights)
  if (!securityDetails) return

  securityDetails.forEach(detail => {
    const existing = depWarnings.get(detail.selector)
    if (existing) {
      existing.count++
    } else {
      depWarnings.set(detail.selector, {
        selector: detail.selector,
        severity: detail.severity,
        category: detail.category,
        description: detail.description,
        count: 1,
      })
    }
  })
}

const processFunding = (
  manifestFunding: NormalizedFunding,
  depFunding: DepFunding,
) => {
  const funding =
    !Array.isArray(manifestFunding) ?
      [manifestFunding]
    : manifestFunding
  for (const entry of funding) {
    if (!entry.url) return

    const { url, type } = entry
    depFunding[url] ??= { url, type, count: 0 }
    depFunding[url].count++
  }
}

const processLicense = (
  license: string,
  licenseInsights: LicenseInsights | undefined,
  depLicenses: DepLicenses,
) => {
  depLicenses.allLicenses[license] =
    (depLicenses.allLicenses[license] || 0) + 1
  depLicenses.totalCount++

  if (licenseInsights) {
    Object.entries(licenseInsights)
      .filter(([, v]) => v)
      .forEach(([warningType]) => {
        const type = warningType as LicenseWarningType
        if (!depLicenses.byWarning[type].licenses.includes(license)) {
          depLicenses.byWarning[type].licenses.push(license)
        }
        depLicenses.byWarning[type].count++
      })
  }
}

const processDuplicatedDeps = (
  dep: QueryResponseNode,
  duplicatedDeps: SelectedItemStoreState['duplicatedDeps'],
) => {
  if (!duplicatedDeps) return

  const { name, version } = dep
  if (!name || !version) return
  duplicatedDeps[name] ??= { count: 0, versions: [] }
  duplicatedDeps[name].count++
  if (!duplicatedDeps[name].versions.includes(version)) {
    duplicatedDeps[name].versions.push(version)
  }
}

const getDependencyInformation = async (
  q: State['q'],
  graph: State['graph'],
  query: State['query'],
  store: StoreApi<SelectedItemStore>,
): Promise<void> => {
  if (!q) {
    store.setState({ isLoadingDependencies: false })
    return
  }

  const counters = initializeCounters()
  const ac = new AbortController()
  let errorMessage: string | null = null

  try {
    const deps = await q.search(query + ' *', {
      signal: ac.signal,
      scopeIDs: graph ? [graph.mainImporter.id] : undefined,
    })
    counters.totalDepCount = deps.nodes.length

    for (const dep of deps.nodes) {
      const { insights, manifest } = dep
      const { scanned, score, license: licenseInsights } = insights
      const license = manifest?.license ?? 'unknown'

      if (scanned) {
        counters.scannedDeps++
        processInsights(insights, counters.depWarnings)
      }

      if (score) {
        counters.averageScore.score += score.overall
        counters.averageScore.count++
      }

      if (manifest?.funding) {
        processFunding(manifest.funding, counters.depFunding)
      }

      processLicense(license, licenseInsights, counters.depLicenses)
      processDuplicatedDeps(dep, counters.duplicatedDeps)
    }
  } catch (err) {
    console.error('getDependencyInformation error:', err)
    errorMessage =
      err instanceof Error ?
        err.message
      : 'Failed to fetch dependency information'
  } finally {
    const {
      depLicenses,
      scannedDeps,
      averageScore,
      depWarnings,
      totalDepCount,
      duplicatedDeps,
      depFunding,
    } = counters

    // Set all dependency info at once to avoid multiple re-renders
    store.setState({
      depLicenses,
      scannedDeps,
      depsAverageScore: Math.floor(
        (averageScore.score / averageScore.count) * 100,
      ),
      depWarnings: Array.from(depWarnings.values()),
      depCount: totalDepCount || undefined,
      duplicatedDeps,
      depFunding,
      isLoadingDependencies: false,
      dependenciesError: errorMessage,
    })
  }
}

type SelectedItemStoreState = DetailsInfo & {
  selectedItem: GridItemData
  manifest: NormalizedManifest | null
  rawManifest: NormalizedManifest | null
  packageScore?: PackageScore
  insights: SocketSecurityDetails[] | undefined
  depCount: number | undefined
  scannedDeps: number | undefined
  depsAverageScore: number | undefined
  depLicenses: DepLicenses | undefined
  depWarnings: DepWarning[] | undefined
  duplicatedDeps: DuplicatedDeps | undefined
  depFunding: DepFunding | undefined
  asideOveriewVisible?: boolean
  /** Loading state for external details (downloads, stars, readme, etc.) */
  isLoadingDetails: boolean
  /** Loading state for dependency information */
  isLoadingDependencies: boolean
  /** Error message if fetching dependency information failed */
  dependenciesError: string | null
}

type SelectedItemStoreAction = {
  setDepLicenses: (
    depLicenses: SelectedItemStoreState['depLicenses'],
  ) => void
  setScannedDeps: (
    scannedDeps: SelectedItemStoreState['scannedDeps'],
  ) => void
  setDepsAverageScore: (
    depsAverageScore: SelectedItemStoreState['depsAverageScore'],
  ) => void
  setDepWarnings: (
    depWarnings: SelectedItemStoreState['depWarnings'],
  ) => void
  setDepCount: (depCount: SelectedItemStoreState['depCount']) => void
  setDuplicatedDeps: (
    duplicatedDeps: SelectedItemStoreState['duplicatedDeps'],
  ) => void
  setDepFunding: (
    depFunding: SelectedItemStoreState['depFunding'],
  ) => void
  setAsideOverviewVisible?: (
    asideOveriewVisible: SelectedItemStoreState['asideOveriewVisible'],
  ) => void
}

export type SelectedItemStore = SelectedItemStoreState &
  SelectedItemStoreAction

const SelectedItemContext = createContext<
  StoreApi<SelectedItemStore> | undefined
>(undefined)

type SelectedItemProviderProps = PropsWithChildren & {
  selectedItem: GridItemData
  asideOveriewVisible?: boolean
}

export const SelectedItemProvider = ({
  children,
  selectedItem,
  asideOveriewVisible = true,
}: SelectedItemProviderProps) => {
  const specOptions = useGraphStore(state => state.specOptions)
  const q = useGraphStore(state => state.q)
  const graph = useGraphStore(state => state.graph)
  const query = useGraphStore(state => state.query)

  /**
   * We initialize the zustand store as a scoped state within the context:
   *
   * This brings Zustand into the react lifecycle and allows us top
   * initialize the store with the selected item while also limiting the access
   * to the store within the context's component tree.
   */
  const selectedItemStore = useRef(
    createStore<SelectedItemStore>(set => ({
      selectedItem,
      asideOveriewVisible,
      manifest: selectedItem.to?.manifest ?? null,
      rawManifest: selectedItem.to?.rawManifest ?? null,
      packageScore: selectedItem.to?.insights.score ?? undefined,
      insights: getSocketInsights(selectedItem.to?.insights),
      scannedDeps: undefined,
      depsAverageScore: undefined,
      depLicenses: undefined,
      depWarnings: undefined,
      depCount: undefined,
      duplicatedDeps: undefined,
      depFunding: undefined,
      isLoadingDetails: true,
      isLoadingDependencies: true,
      dependenciesError: null,
      setDepLicenses: (
        depLicenses: SelectedItemStoreState['depLicenses'],
      ) => set(() => ({ depLicenses })),
      setScannedDeps: (
        scannedDeps: SelectedItemStoreState['scannedDeps'],
      ) => set(() => ({ scannedDeps })),
      setDepsAverageScore: (
        depsAverageScore: SelectedItemStoreState['depsAverageScore'],
      ) => set(() => ({ depsAverageScore })),
      setDepWarnings: (
        depWarnings: SelectedItemStoreState['depWarnings'],
      ) => set(() => ({ depWarnings })),
      setDepCount: (depCount: SelectedItemStoreState['depCount']) =>
        set(() => ({ depCount })),
      setDuplicatedDeps: (
        duplicatedDeps: SelectedItemStoreState['duplicatedDeps'],
      ) => set(() => ({ duplicatedDeps })),
      setDepFunding: (
        depFunding: SelectedItemStoreState['depFunding'],
      ) => set(() => ({ depFunding })),
      setAsideOverviewVisible: (
        asideOveriewVisible: SelectedItemStoreState['asideOveriewVisible'],
      ) => set(() => ({ asideOveriewVisible })),
    })),
  ).current

  // Track if we've already started fetching to prevent duplicate requests
  const hasFetchedDetails = useRef(false)

  useEffect(() => {
    // Prevent duplicate fetches (React StrictMode, dependency changes, etc.)
    if (hasFetchedDetails.current) return
    hasFetchedDetails.current = true

    const fetchDetailsAsync = async () => {
      const item = selectedItemStore.getState().selectedItem

      // Determine the spec and manifest based on item type
      const spec =
        item.spec ? (item.spec as Spec).final
        : item.to?.name ?
          hydrate(item.to.id, item.to.name, specOptions)
        : null

      if (!spec) {
        selectedItemStore.setState({ isLoadingDetails: false })
        return
      }

      const manifest = item.to?.manifest ?? undefined

      // For local packages (item.to exists), we can fetch README from node_modules
      // For external packages, we fetch from unpkg
      const packageLocation = item.to?.location
      const projectRoot = item.to?.projectRoot

      try {
        // Fetch all details in one call - this handles:
        // - Fetching packument/manifest from registry if needed
        // - Publisher info and avatar
        // - Downloads, stars, issues, PRs, readme, versions, etc.
        // For local packages, README is fetched from node_modules instead of unpkg
        const details = await fetchDetails({
          spec,
          manifest,
          packageLocation,
          projectRoot,
        })

        // Set all state at once (including the fetched manifest if we didn't have one)
        selectedItemStore.setState(state => ({
          ...state,
          ...details,
          // Use the fetched manifest if we didn't already have one
          manifest:
            state.manifest ??
            (details.manifest as NormalizedManifest | undefined) ??
            null,
          isLoadingDetails: false,
        }))
      } catch (err) {
        // This catch block should never be reached due to error handling in fetchDetails,
        // but we keep it as a safety net for logging purposes
        console.error('fetchDetails error:', err)
        selectedItemStore.setState({ isLoadingDetails: false })
      }
    }

    void fetchDetailsAsync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Track if we've already started fetching dependency info
  const hasFetchedDependencies = useRef(false)

  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetchedDependencies.current) return
    hasFetchedDependencies.current = true

    // Skip dependency information for external packages (they have no graph context)
    if (!selectedItem.to) {
      selectedItemStore.setState({ isLoadingDependencies: false })
      return
    }

    void getDependencyInformation(q, graph, query, selectedItemStore)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return (
    <SelectedItemContext.Provider value={selectedItemStore}>
      {children}
    </SelectedItemContext.Provider>
  )
}

export const useSelectedItemStore = <T,>(
  selector: (state: SelectedItemStore) => T,
) => {
  const store = useContext(SelectedItemContext)
  if (!store) {
    throw new Error(
      'useSelectedItemStore must be used within a SelectedItemProvider',
    )
  }
  return useStore(store, selector)
}

export const useTabNavigation = (): {
  tab: Tab
  subTab: SubTabDependencies | undefined
  setActiveTab: (tab: Tab) => void
  setActiveSubTab: (subTab: SubTabDependencies, tab?: Tab) => void
} => {
  const params = useParams<{
    query?: string
    package?: string
    version?: string
    tab: Tab
    subTab?: SubTabDependencies
  }>()
  const navigate = useNavigate()

  // Check if we're on an npm package route (with or without version)
  const isNpmRoute = !!params.package
  const hasVersion = !!params.version
  const routeParam = params.package || params.query || ''

  const getConstructedURL = (
    routeParam: string,
    tab: Tab,
    subTab?: SubTabDependencies,
  ) => {
    const subTabValue =
      tab === 'dependencies' ?
        subTab ? subTab
        : 'insights'
      : ''

    if (isNpmRoute) {
      const basePath =
        hasVersion ?
          '/explore/npm/:package/v/:version/:tab/:subTab'
        : '/explore/npm/:package/:tab/:subTab'

      return generatePath(basePath, {
        package: routeParam,
        version: params.version ?? '',
        tab,
        subTab: subTabValue,
      })
    } else {
      return generatePath('/explore/:query/:tab/:subTab', {
        query: routeParam,
        tab,
        subTab: subTabValue,
      })
    }
  }

  const setActiveTab = (tab: Tab) => {
    const newPath = getConstructedURL(routeParam, tab)
    void navigate(newPath)
  }

  const setActiveSubTab = (
    subTab: SubTabDependencies,
    tab: Tab = 'dependencies',
  ) => {
    const newPath = getConstructedURL(routeParam, tab, subTab)
    void navigate(newPath)
  }

  return {
    tab: params.tab ?? 'overview',
    subTab: params.subTab,
    setActiveTab,
    setActiveSubTab,
  }
}
