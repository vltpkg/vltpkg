import { actual, GraphModifier } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { commandUsage } from '../config/usage.ts'
import { stderr } from '../output.ts'
import { isVerbose } from '../verbose-log.ts'
import {
  buildAuditQuery,
  aggregateBySeverity,
  emptyAuditResult,
  filterAuditResult,
  formatAuditSummary,
  scanCoverage,
} from '../audit-helpers.ts'
import type { SeverityLevel, AuditResult } from '../audit-helpers.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'audit',
    usage: ['[--audit-level=level]', '[--view=human | json | count]'],
    description: `Check installed dependencies for security issues.

      Provides a summary of security findings including malware,
      vulnerable packages, and typosquats. Use --audit-level to filter
      by minimum severity.`,
    examples: {
      ['audit']: {
        description: 'Scan all dependencies for security issues',
      },
      [`--audit-level=high`]: {
        description: 'Only show high and critical severity issues',
      },
      [`--view=json`]: {
        description: 'Output results as JSON',
      },
      [`--view=count`]: {
        description: 'Print only the number of packages with issues',
      },
    },
    options: {
      'audit-level': {
        value: '[low | medium | high | critical]',
        description: `Minimum severity level to report. Defaults to
                      low. Accepts \`moderate\` as an npm-compatible
                      alias for \`medium\`. Findings the feed reports
                      as actively exploited are shown whatever the
                      level.`,
      },
      view: {
        value: '[human | json | count]',
        description: 'Output format. Defaults to human-readable.',
      },
    },
  })

export const command: CommandFn<AuditResult> = async conf => {
  const modifiers = GraphModifier.maybeLoad(conf.options)
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.maybeRead(
    conf.options.projectRoot,
  )

  if (!mainManifest) {
    if (isVerbose(conf.values.loglevel)) {
      stderr('No package.json found in project root')
    }
    return emptyAuditResult()
  }

  const graph = actual.load({
    ...conf.options,
    mainManifest,
    modifiers,
    monorepo,
    loadManifests: true,
  })

  const securityArchive = await SecurityArchive.start({
    nodes: [...graph.nodes.values()],
  })

  // npm spells this level "moderate"; we call it "medium". jackspeak
  // has no normalize hook -- only validate -- so the alias has to be
  // resolved here, at the point of use. Skipping it silently fell
  // through to the 'low' default, which reported every low-severity
  // finding under --audit-level=moderate.
  const auditLevelRaw = conf.get('audit-level')
  const normalized =
    auditLevelRaw === 'moderate' ? 'medium' : auditLevelRaw
  const auditLevel: SeverityLevel =
    (
      normalized === 'critical' ||
      normalized === 'high' ||
      normalized === 'medium' ||
      normalized === 'low'
    ) ?
      normalized
    : 'low'

  const queryString = buildAuditQuery(auditLevel)

  // graph.importers includes workspace roots, not just the main
  // importer -- a dependency declared directly by a workspace should
  // be classified as direct, not transitive.
  const importers = graph.importers

  const q = new Query({
    edges: graph.edges,
    nodes: new Set(graph.nodes.values()),
    importers,
    securityArchive,
  })

  const { nodes } = await q.search(queryString, {
    signal: new AbortController().signal,
  })

  const result = aggregateBySeverity(
    nodes,
    importers,
    message => {
      if (isVerbose(conf.values.loglevel)) stderr(message)
    },
    securityArchive,
  )

  // Coverage is measured over the whole graph, not the query results --
  // every result matched a security selector and so had feed data, which
  // would report near-total coverage regardless of the truth.
  const coverage = scanCoverage(graph.nodes.values())
  result.scannedCount = coverage.scanned
  result.unscannedCount = coverage.unscanned

  const filtered = filterAuditResult(result, auditLevel)

  // Exit with error code when findings are present, matching npm/pnpm behavior
  if (filtered.total > 0) {
    process.exitCode = 1
  }

  return filtered
}

export const views = {
  human: (
    result: AuditResult,
    { colors }: { colors?: boolean } = {},
  ) => formatAuditSummary(result, { colors }),
  json: (result: AuditResult) => result,
  count: (result: AuditResult) => result.total,
}
