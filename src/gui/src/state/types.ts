import {
  type LockfileData,
  type GraphLike,
  type NodeLike,
  type EdgeLike,
} from '@vltpkg/graph'
import { type Query } from '@vltpkg/query'
import { type SpecOptionsFilled } from '@vltpkg/spec/browser'
import { type Integrity, type Manifest } from '@vltpkg/types'

export type Action = {
  updateActiveRoute: (route: State['activeRoute']) => void
  updatePreviousRoute: (route: State['activeRoute']) => void
  updateDashboard: (dashboard: State['dashboard']) => void
  updateGraph: (graph: State['graph']) => void
  updateQ: (q: State['q']) => void
  updateQuery: (query: State['query']) => void
  updateEdges: (edges: State['edges']) => void
  updateErrorCause: (errorCause: State['errorCause']) => void
  updateHasDashboard: (hasDashboard: State['hasDashboard']) => void
  updateLinePositionReference: (position: number) => void
  updateNodes: (nodes: State['nodes']) => void
  updateProjectInfo: (projectInfo: State['projectInfo']) => void
  updateSelectedNode: (node: State['selectedNode']) => void
  updateSpecOptions: (specOptions: State['specOptions']) => void
  updateStamp: () => void
  updateTheme: (theme: State['theme']) => void
  reset: () => void
  saveQuery: (item: SavedQuery) => void
  updateSavedQuery: (savedQuery: SavedQuery) => void
  deleteSavedQueries: (savedQueries: SavedQuery[]) => void
  saveQueryLabel: (queryLabel: QueryLabel) => void
  updateSavedQueryLabel: (queryLabel: QueryLabel) => void
  deleteSavedQueryLabels: (queryLabels: QueryLabel[]) => void
}

/**
 * Project information present in the transfer data object.
 */
export type ProjectInfo = {
  /**
   * Other tools used by this project, such as runtime and package mangager.
   */
  tools: DashboardTools[]
  /**
   * `true` if this package node_modules folder was installed
   * using the vlt client.
   */
  vltInstalled?: boolean
}

/**
 * Transfer data object used to send data from the cli.
 */
export type TransferData = {
  importers: RawNode[]
  lockfile: LockfileData
  projectInfo: ProjectInfo
}

export type RawNode = {
  importer: boolean
  id: string
  name: string
  version: string
  location: string
  manifest: Manifest
  projectRoot?: string
  integrity?: Integrity
  resolved?: string
  dev: boolean
  optional: boolean
}

/**
 * The main state object for the graph explorer.
 */
export type State = {
  /**
   * The current location.pathname (e.g. route) in the app.
   */
  activeRoute: string
  /**
   * The last route in the app.
   */
  previousRoute: string
  /**
   * List of projects to be displayed in the dashboard.
   */
  dashboard?: DashboardData
  /**
   * Current graph to be explored.
   */
  graph?: GraphLike
  /**
   * List of selected edges returned after querying the graph.
   */
  edges: EdgeLike[]
  /**
   * An informative message to be displayed when an error occurs.
   */
  errorCause: string
  /**
   * Whether the dashboard is enabled or not.
   */
  hasDashboard: boolean
  /**
   * A reference value to properly draw connections between nodes in the graph.
   */
  linePositionReference: number
  /**
   * List of selected nodes returned after querying the graph.
   */
  nodes: NodeLike[]
  /**
   * Information about the current project being explored.
   */
  projectInfo: ProjectInfo
  /**
   * Holds the reference to the {@link Query} instance object.
   */
  q?: Query
  /**
   * The query string typed by the user in the interface.
   */
  query: string
  // TODO: remove selectedNode as it's unused
  /**
   * Reference to a currently selected node.
   */
  selectedNode?: NodeLike
  /**
   * Spec options used for the current graph.
   */
  specOptions?: SpecOptionsFilled
  /**
   * A random string to control when graph data should be reloaded.
   */
  stamp: string
  /**
   * Store the current theme value.
   */
  theme: 'light' | 'dark'
  /**
   * Saved queries in localStorage.
   */
  savedQueries?: SavedQuery[]
  /**
   * Saved labels used for query tags in localStorage.
   */
  savedQueryLabels?: QueryLabel[]
}

export type DashboardTools =
  | 'vlt'
  | 'node'
  | 'deno'
  | 'bun'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'js'

export type DashboardLocation = {
  /**
   * The file system path to the directory.
   */
  path: string
  /**
   * A shortened, human readable path to be displayed in the dashboard.
   */
  readablePath: string
}

export type DashboardData = {
  /**
   * The reference current working directory.
   */
  cwd: string
  /**
   * The app version.
   */
  buildVersion: string
  /**
   * The default author name to be used when creating new projects.
   */
  defaultAuthor: string
  /**
   * A list of projects to be displayed in the dashboard.
   */
  projects: DashboardDataProject[]
  /**
   * A list of directories that are read to find projects
   * to display in the dashboard. New projects can also be created
   * in these folders.
   */
  dashboardProjectLocations: DashboardLocation[]
}

export type QueryLabel = {
  id: string
  color: Color
  name: string
  description: string
}

export type SavedQuery = {
  id: string
  name: string
  context: string
  query: string
  dateCreated: string
  dateModified: string
  labels?: QueryLabel[]
}

export type DashboardDataProject = {
  name: string
  readablePath: string
  path: string
  manifest: Manifest
  tools: DashboardTools[]
  mtime?: number | null
}

export type Color = `#${string}`
