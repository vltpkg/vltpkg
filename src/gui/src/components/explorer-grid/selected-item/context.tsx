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
import {
  fetchDetails,
  publicRegistry,
  readAuthor,
  retrieveAvatar,
} from '@/lib/external-info.ts'
import { PSEUDO_SECURITY_SELECTORS } from '@/lib/constants/index.ts'
import { generatePath, useNavigate, useParams } from 'react-router'
import { Spec } from '@vltpkg/spec/browser'
import { normalizeManifest } from '@vltpkg/types'

import type {
  SocketCategory,
  SocketSecurityDetails,
  SocketSeverity,
} from '@/lib/constants/index.ts'
import type { StoreApi } from 'zustand'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DetailsInfo } from '@/lib/external-info.ts'
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
  Packument,
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
        processFunding(manifest.funding, counters.depFunding)
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
      setAsideOverviewVisible: (
        asideOveriewVisible: SelectedItemStoreState['asideOveriewVisible'],
      ) => set(() => ({ asideOveriewVisible })),
    })),
  ).current

  const fetchDetailsAsync = useCallback(
    async (store: StoreApi<SelectedItemStore>) => {
      const state = store.getState()
      const item = state.selectedItem

      // For external packages (from search results), use the spec directly
      if (!item.to && item.spec) {
        const abortController = new AbortController()
        const spec = item.spec
        try {
          // Fetch the manifest from npm registry
          let manifest: NormalizedManifest | null = null

          // Get the final spec which contains the parsed information
          const finalSpec = (spec as Spec).final
          let manifestHydratedSpec: Spec | undefined

          // Extract package name and version from the spec
          // The spec was created from something like "npm:express@4.21.1"
          // We need to separate the package name from the version
          const packageName = item.name // This should just be the package name (e.g., "express")

          const registry = finalSpec.registry || publicRegistry

          if (registry === publicRegistry) {
            try {
              const url = new URL(registry)
              url.pathname = packageName

              const response = await fetch(String(url), {
                signal: abortController.signal,
              })

              if (!response.ok) {
                throw new Error(
                  `Failed to fetch packument: ${response.status}`,
                )
              }

              const packument = (await response.json()) as Packument

              // For external packages, use the version from bareSpec if available, otherwise latest
              // bareSpec is set when user navigates to a specific version
              let version: string | undefined

              // Check if bareSpec has a version (not the registry URL)
              if (
                finalSpec.bareSpec &&
                !finalSpec.bareSpec.startsWith('http')
              ) {
                version = finalSpec.bareSpec
              } else {
                version = packument['dist-tags'].latest
              }

              const manifestData =
                version ? packument.versions[version] : undefined
              if (manifestData) {
                manifest = normalizeManifest(manifestData)

                // use a spec with the info from the response manifest
                manifestHydratedSpec = Spec.parse(
                  manifest.name || finalSpec.name,
                  manifest.version || finalSpec.bareSpec,
                  specOptions,
                )

                // Extract publisher info from _npmUser before it's lost
                const npmUser =
                  '_npmUser' in manifestData ?
                    manifestData._npmUser
                  : undefined
                const publisher =
                  (
                    npmUser &&
                    typeof npmUser === 'object' &&
                    'name' in npmUser
                  ) ?
                    readAuthor({
                      name: String(npmUser.name),
                      email:
                        'email' in npmUser ?
                          String(npmUser.email)
                        : undefined,
                      url:
                        'url' in npmUser ?
                          String(npmUser.url)
                        : undefined,
                    })
                  : undefined

                // Update store with normalized manifest and publisher info
                const stateUpdate: Partial<SelectedItemStoreState> = {
                  manifest,
                }

                if (publisher) {
                  stateUpdate.publisher = publisher

                  // Fetch publisher avatar if email is available
                  if (publisher.email) {
                    retrieveAvatar(publisher.email)
                      .then(src => {
                        store.setState(state => ({
                          ...state,
                          publisherAvatar: {
                            src,
                            alt:
                              publisher.name ?
                                `${publisher.name}'s avatar`
                              : 'avatar',
                          },
                        }))
                      })
                      .catch(() => {
                        // Ignore avatar fetch errors
                      })
                  }
                }

                store.setState(state => ({
                  ...state,
                  ...stateUpdate,
                }))
              }
            } catch (err) {
              console.error(
                'Failed to fetch external package manifest:',
                err,
              )
            }
          }

          // Fetch additional details (downloads, stars, etc.)
          // Pass the normalized manifest with repository info
          // We need to create a clean spec with just the package name (no npm: prefix)
          // and the version in bareSpec for fetchDetails to work correctly with the npm API
          for await (const d of fetchDetails(
            manifestHydratedSpec ?? finalSpec,
            abortController.signal,
            manifest ?? undefined,
          )) {
            store.setState(state => ({
              ...state,
              ...d,
            }))
          }
        } finally {
          abortController.abort()
        }
        return
      }

      // For packages from the graph, use the hydrated dep ID
      if (!item.to?.name) return

      console.log('item.to.id', item.to.id)
      console.log('item.to.name', item.to.name)
      console.log('specOptions', specOptions)
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
    // Skip dependency information for external packages (they have no graph context)
    if (!selectedItem.to) return

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
  }, [q, graph, query, selectedItem.to, selectedItemStore])

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
