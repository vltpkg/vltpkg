import { actual, GraphModifier } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { commandUsage } from '../config/usage.ts'
import { stderr } from '../output.ts'
import { isWarnEnabled } from '../verbose-log.ts'
import {
  buildAuditQuery,
  aggregateBySeverity,
  emptyAuditResult,
  filterAuditResult,
  formatAuditSummary,
} from '../audit-helpers.ts'
import type { SeverityLevel, AuditResult } from '../audit-helpers.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'audit',
    usage: [''],
    description: `Check installed dependencies for security issues.

      Provides a summary of security findings including malware,
      vulnerable packages, and typosquats. Use --audit-level to filter
      by minimum severity.`,
    examples: {
      ['']: {
        description: 'Scan all dependencies for security issues',
      },
      [`--audit-level=high`]: {
        description: 'Only show high and critical severity issues',
      },
      [`--view=json`]: {
        description: 'Output results as JSON',
      },
    },
    options: {
      'audit-level': {
        value: '[low | moderate | high | critical]',
        description:
          'Minimum severity level to report. Defaults to low.',
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
    if (isWarnEnabled(conf.values.loglevel)) {
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

  const auditLevelRaw = conf.get('audit-level')
  const auditLevel: SeverityLevel =
    (
      auditLevelRaw === 'critical' ||
      auditLevelRaw === 'high' ||
      auditLevelRaw === 'moderate' ||
      auditLevelRaw === 'low'
    ) ?
      auditLevelRaw
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

  const result = aggregateBySeverity(nodes, importers, message => {
    if (isWarnEnabled(conf.values.loglevel)) stderr(message)
  })
  return filterAuditResult(result, auditLevel)
}

export const views = {
  human: (
    result: AuditResult,
    { colors }: { colors?: boolean } = {},
  ) => formatAuditSummary(result, { colors }),
  json: (result: AuditResult) => result,
  count: (result: AuditResult) => result.total,
}
