import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec/browser'
import type {
  SecurityArchiveLike,
  PackageScore,
} from '@vltpkg/security-archive'
import type { DepID } from '@vltpkg/dep-id'
import type { PostcssNode } from '@vltpkg/dss-parser'

export type Specificity = {
  idCounter: number
  commonCounter: number
}

export type GraphSelectionState = {
  nodes: Set<NodeLike>
  edges: Set<EdgeLike>
}

export type ParserState = {
  cancellable: () => Promise<void>
  collect: GraphSelectionState
  comment: string
  current: PostcssNode
  initial: GraphSelectionState
  loose?: boolean
  next?: PostcssNode
  prev?: PostcssNode
  result?: NodeLike[]
  signal: AbortSignal
  walk: ParserFn
  partial: GraphSelectionState
  retries: number
  securityArchive: SecurityArchiveLike | undefined
  specOptions: SpecOptions
  scopeIDs?: DepID[]
  specificity: Specificity
}

export type QueryResponse = {
  edges: QueryResponseEdge[]
  nodes: QueryResponseNode[]
  comment: string
  specificity: Specificity
}

export type QueryResponseEdge = Omit<EdgeLike, 'from' | 'to'> & {
  from: QueryResponseNode
  to?: QueryResponseNode
}

export type QueryResponseNode = Omit<
  NodeLike,
  'edgesIn' | 'edgesOut'
> & {
  edgesIn: Set<QueryResponseEdge>
  edgesOut: Map<string, QueryResponseEdge>
  insights: Insights
  toJSON: () => Pick<
    QueryResponseNode,
    | 'id'
    | 'name'
    | 'version'
    | 'location'
    | 'importer'
    | 'manifest'
    | 'projectRoot'
    | 'integrity'
    | 'resolved'
    | 'dev'
    | 'optional'
    | 'insights'
    | 'confused'
  >
}

export type Insights = {
  abandoned?: boolean
  confused?: boolean
  cve?: `CVE-${string}`[]
  cwe?: `CWE-${string}`[]
  debug?: boolean
  deprecated?: boolean
  dynamic?: boolean
  entropic?: boolean
  env?: boolean
  eval?: boolean
  fs?: boolean
  license?: LicenseInsights
  malware?: MalwareInsights
  minified?: boolean
  native?: boolean
  network?: boolean
  obfuscated?: boolean
  scanned: boolean
  score?: PackageScore
  scripts?: boolean
  severity?: SeverityInsights
  shell?: boolean
  shrinkwrap?: boolean
  squat?: SquatInsights
  suspicious?: boolean
  tracker?: boolean
  trivial?: boolean
  undesirable?: boolean
  unknown?: boolean
  unmaintained?: boolean
  unpopular?: boolean
  unstable?: boolean
}

export type LicenseInsights = {
  unlicensed: boolean
  misc: boolean
  restricted: boolean
  ambiguous: boolean
  copyleft: boolean
  unknown: boolean
  none: boolean
  exception: boolean
}

export type LeveledInsights = {
  low: boolean
  medium: boolean
  high: boolean
  critical: boolean
}

export type MalwareInsights = LeveledInsights
export type SeverityInsights = LeveledInsights

export type SquatInsights = {
  medium: boolean
  critical: boolean
}

export type ParserFn = (opt: ParserState) => Promise<ParserState>

export type ParsedSelectorToken = PostcssNode & {
  token: string
}
