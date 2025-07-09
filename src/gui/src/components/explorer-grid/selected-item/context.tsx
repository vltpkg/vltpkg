import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { useStore, createStore } from 'zustand'
import { hydrate } from '@vltpkg/dep-id/browser'
import { useGraphStore } from '@/state/index.ts'
import { fetchDetails } from '@/lib/external-info.ts'
import { SOCKET_SECURITY_DETAILS } from '@/lib/constants/index.ts'
import { generatePath, useNavigate, useParams } from 'react-router'

import type { StoreApi } from 'zustand'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DetailsInfo } from '@/lib/external-info.ts'
import type {
  Insights,
  QueryResponseNode,
  LicenseInsights,
} from '@vltpkg/query'
import type { PropsWithChildren } from 'react'
import type { SocketSecurityDetails } from '@/lib/constants/socket.ts'
import type { PackageScore } from '@vltpkg/security-archive'
import type { Manifest, NormalizedFunding } from '@vltpkg/types'
import type { State } from '@/state/types.ts'

export type Tab =
  | 'overview'
  | 'insights'
  | 'versions'
  | 'json'
  | 'dependencies'
  | 'contributors'

export type SubTabDependencies =
  | 'insights'
  | 'licenses'
  | 'funding'
  | 'duplicates'

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
      severity: SocketSecurityDetails['severity']
    }
  >
  totalCount: number
}

export type DepWarning = {
  selector: string
  severity: SocketSecurityDetails['severity']
  description: string
  category: SocketSecurityDetails['category']
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

  return Object.entries(insights)
    .flatMap(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        return SOCKET_SECURITY_DETAILS[
          key as keyof typeof SOCKET_SECURITY_DETAILS
        ] as SocketSecurityDetails
      }

      if (typeof value === 'object') {
        return Object.entries(value)
          .filter(([, subValue]) => subValue === true)
          .map(([subKey]) => {
            const parentInsight =
              SOCKET_SECURITY_DETAILS[
                key as keyof typeof SOCKET_SECURITY_DETAILS
              ]
            return (
                parentInsight && typeof parentInsight === 'object'
              ) ?
                (parentInsight[
                  subKey as keyof typeof parentInsight
                ] as SocketSecurityDetails)
              : undefined
          })
          .filter(Boolean)
      }

      return []
    })
    .filter(Boolean) as SocketSecurityDetails[]
}

export const getLicenseSeverity = (
  warningType: LicenseWarningType,
): SocketSecurityDetails['severity'] => {
  const licenseDetails = SOCKET_SECURITY_DETAILS.license as Record<
    LicenseWarningType,
    SocketSecurityDetails
  >
  return licenseDetails[warningType].severity
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
  for (const [key, value] of Object.entries(insights)) {
    if (
      !value ||
      key === 'score' ||
      key === 'scanned' ||
      key === 'license'
    )
      continue

    if (typeof value === 'boolean') {
      const detail = SOCKET_SECURITY_DETAILS[
        key as keyof typeof SOCKET_SECURITY_DETAILS
      ] as SocketSecurityDetails
      const selector = String(detail.selector)
      const existing = depWarnings.get(selector)
      if (existing) {
        existing.count++
      } else {
        depWarnings.set(selector, {
          selector,
          severity: detail.severity,
          category: detail.category,
          description: detail.description,
          count: 1,
        })
      }
    } else if (typeof value === 'object') {
      const parentInsight =
        SOCKET_SECURITY_DETAILS[
          key as keyof typeof SOCKET_SECURITY_DETAILS
        ]
      if (parentInsight && typeof parentInsight === 'object') {
        Object.entries(value as Record<string, boolean>)
          .filter(([, subValue]) => subValue)
          .forEach(([subKey]) => {
            const detail = parentInsight[
              subKey as keyof typeof parentInsight
            ] as SocketSecurityDetails
            const selector = String(detail.selector)
            const existing = depWarnings.get(selector)
            if (existing) {
              existing.count++
            } else {
              depWarnings.set(selector, {
                selector,
                severity: detail.severity,
                category: detail.category,
                description: detail.description,
                count: 1,
              })
            }
          })
      }
    }
  }
}

const processFunding = (
  funding: NormalizedFunding,
  depFunding: DepFunding,
) => {
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
  setDepLicenses: SelectedItemStore['setDepLicenses'],
  setScannedDeps: SelectedItemStore['setScannedDeps'],
  setDepsAverageScore: SelectedItemStore['setDepsAverageScore'],
  setDepWarnings: SelectedItemStore['setDepWarnings'],
  setDepCount: SelectedItemStore['setDepCount'],
  setDuplicatedDeps: SelectedItemStore['setDuplicatedDeps'],
  setDepFunding: SelectedItemStore['setDepFunding'],
): Promise<void> => {
  if (!q) return

  const counters = initializeCounters()
  const ac = new AbortController()

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
        processFunding(
          manifest.funding as NormalizedFunding,
          counters.depFunding,
        )
      }

      processLicense(license, licenseInsights, counters.depLicenses)
      processDuplicatedDeps(dep, counters.duplicatedDeps)
    }
  } catch (err) {
    console.error(err)
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

    setDepLicenses(depLicenses)
    setScannedDeps(scannedDeps)
    setDepsAverageScore(
      Math.floor((averageScore.score / averageScore.count) * 100),
    )
    setDepWarnings(Array.from(depWarnings.values()))
    setDepCount(totalDepCount || undefined)
    setDuplicatedDeps(duplicatedDeps)
    setDepFunding(depFunding)
  }
}

type SelectedItemStoreState = DetailsInfo & {
  selectedItem: GridItemData
  manifest: Manifest | null
  rawManifest: Manifest | null
  packageScore?: PackageScore
  insights: SocketSecurityDetails[] | undefined
  depCount: number | undefined
  scannedDeps: number | undefined
  depsAverageScore: number | undefined
  depLicenses: DepLicenses | undefined
  depWarnings: DepWarning[] | undefined
  duplicatedDeps: DuplicatedDeps | undefined
  depFunding: DepFunding | undefined
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
}

export type SelectedItemStore = SelectedItemStoreState &
  SelectedItemStoreAction

const SelectedItemContext = createContext<
  StoreApi<SelectedItemStore> | undefined
>(undefined)

type SelectedItemProviderProps = PropsWithChildren & {
  selectedItem: GridItemData
}

export const SelectedItemProvider = ({
  children,
  selectedItem,
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
      manifest: selectedItem.to?.manifest ?? null,
      rawManifest: selectedItem.to?.rawManifest ?? null,
      packageScore: selectedItem.to?.insights.score,
      insights: getSocketInsights(selectedItem.to?.insights),
      scannedDeps: undefined,
      depsAverageScore: undefined,
      depLicenses: undefined,
      depWarnings: undefined,
      depCount: undefined,
      duplicatedDeps: undefined,
      depFunding: undefined,
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
    })),
  ).current

  const fetchDetailsAsync = useCallback(
    async (store: StoreApi<SelectedItemStore>) => {
      const state = store.getState()
      const item = state.selectedItem

      if (!item.to?.name) return

      const depIdSpec = hydrate(item.to.id, item.to.name, specOptions)
      const manifest = item.to.manifest ?? {}
      const abortController = new AbortController()

      try {
        for await (const d of fetchDetails(
          depIdSpec,
          abortController.signal,
          manifest,
        )) {
          store.setState(state => ({
            ...state,
            ...d,
          }))
        }
      } finally {
        abortController.abort()
      }
    },
    [query, specOptions], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    void fetchDetailsAsync(selectedItemStore)
  }, [fetchDetailsAsync, selectedItemStore])

  useEffect(() => {
    void getDependencyInformation(
      q,
      graph,
      query,
      selectedItemStore.getState().setDepLicenses,
      selectedItemStore.getState().setScannedDeps,
      selectedItemStore.getState().setDepsAverageScore,
      selectedItemStore.getState().setDepWarnings,
      selectedItemStore.getState().setDepCount,
      selectedItemStore.getState().setDuplicatedDeps,
      selectedItemStore.getState().setDepFunding,
    )
  }, [q, graph, query, selectedItemStore])

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
  const {
    query = '',
    tab,
    subTab,
  } = useParams<{
    query: string
    tab: Tab
    subTab?: SubTabDependencies
  }>()
  const navigate = useNavigate()

  const getConstructedURL = (
    query: string,
    tab: Tab,
    subTab?: SubTabDependencies,
  ) => {
    return generatePath('/explore/:query/:tab/:subTab', {
      query,
      tab,
      subTab:
        tab === 'dependencies' ?
          subTab ? subTab
          : 'insights'
        : '',
    })
  }

  const setActiveTab = (tab: Tab) => {
    const newPath = getConstructedURL(query, tab)
    void navigate(newPath)
  }

  const setActiveSubTab = (
    subTab: SubTabDependencies,
    tab: Tab = 'dependencies',
  ) => {
    const newPath = getConstructedURL(query, tab, subTab)
    void navigate(newPath)
  }

  return {
    tab: tab ?? 'overview',
    subTab,
    setActiveTab,
    setActiveSubTab,
  }
}
