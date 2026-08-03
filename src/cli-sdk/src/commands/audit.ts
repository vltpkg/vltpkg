import { actual, GraphModifier } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { commandUsage } from '../config/usage.ts'
import { stdout } from '../output.ts'
import {
  buildAuditQuery,
  aggregateBySeverity,
  filterAuditResult,
  type SeverityLevel,
} from '../audit-helpers.ts'
import type { AuditResult } from '../audit-helpers.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { LoadedConfig } from '../config/index.ts'

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
      [`vlt audit`]: {
        description: 'Scan all dependencies for security issues',
      },
      [`vlt audit --audit-level=high`]: {
        description: 'Only show high and critical severity issues',
      },
      [`vlt audit --view=json`]: {
        description: 'Output results as JSON',
      },
    },
    options: {
      'audit-level': {
        value: '[low | moderate | high | critical]',
        description:
          'Minimum severity level to report. Defaults to low.',
      },
      omit: {
        value: '[dev | optional | peer]',
        description: 'Dependency types to skip.',
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
    stdout('No package.json found in project root')
    return {
      summary: { critical: [], high: [], moderate: [], low: [] },
      total: 0,
      directCount: 0,
      indirectCount: 0,
    }
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

  const auditLevel = (conf.get('audit-level') as string) ?? 'low'
  const queryString = buildAuditQuery(auditLevel)

  const q = new Query({
    edges: graph.edges,
    nodes: new Set(graph.nodes.values()),
    importers: new Set([graph.mainImporter]),
    securityArchive,
  })

  const { nodes } = await q.search(queryString, {
    signal: new AbortController().signal,
  })

  const importers = new Set([graph.mainImporter])
  const result = aggregateBySeverity(nodes, importers)
  return filterAuditResult(result, auditLevel as SeverityLevel)
}

export const views = {
  human: (result: AuditResult, { colors }: { colors?: boolean }) => {
    if (result.total === 0) {
      return 'found 0 security issues\n'
    }

    const lines: string[] = []
    lines.push(
      `found ${result.total} security issue${result.total === 1 ? '' : 's'}`,
    )
    lines.push('')

    const severityOrder = [
      'critical',
      'high',
      'moderate',
      'low',
    ] as const
    for (const severity of severityOrder) {
      const pkgs = result.summary[severity]
      if (pkgs.length === 0) continue

      lines.push(`  ${severity} (${pkgs.length})`)
      for (const pkg of pkgs) {
        lines.push(`    ${pkg.name}@${pkg.version}`)
        for (const alert of pkg.alerts) {
          lines.push(`      ${alert}`)
        }
      }
      lines.push('')
    }

    const directWord =
      result.directCount === 1 ? 'dependency' : 'dependencies'
    lines.push(
      `${result.directCount} direct ${directWord}, ${result.indirectCount} transitive`,
    )

    return lines.join('\n')
  },
  json: (result: AuditResult) => result,
  count: (result: AuditResult) => result.total,
}
