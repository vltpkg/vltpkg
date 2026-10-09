import * as dotProp from '@vltpkg/dot-prop'
import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { SecurityArchive } from '@vltpkg/security-archive'
import { Spec } from '@vltpkg/spec'
import { commandUsage } from '../config/usage.ts'
import { createStubNode } from '../stub-node.ts'
import type { Manifest, Packument } from '@vltpkg/types'
import type {
  PackageReportData,
  PackageAlert,
} from '@vltpkg/security-archive'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { ViewOptions, Views } from '../view.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'view',
    usage: [
      '<pkg>[@<version>] [<field>]',
      '<pkg>[@<version>] [--view=human | json]',
    ],
    description: `View registry information about a package.

      Fetches and displays packument and manifest data for a given
      package from the registry.

      When a specific field is provided, only that field value is
      displayed. Use dot-prop syntax to access nested fields
      (e.g., \`dist-tags.latest\`, \`dependencies.lodash\`).

      Security data from the vlt security archive is shown when
      available, including scores and alerts.

      Use \`.\` (or no args) for the package in the current directory
      (nearest package.json), \`.@<version>\` to pick a version.
      Private packages show local package.json info.`,
    examples: {
      express: {
        description: 'View info about the latest version of express',
      },
      'express@4.18.2': {
        description: 'View info about a specific version',
      },
      'express versions': {
        description: 'List all published versions',
      },
      'express dist-tags': {
        description: 'Show all dist-tags',
      },
      'express dependencies': {
        description: 'Show dependencies of the latest version',
      },
      'express dist-tags.latest': {
        description: 'Show the latest dist-tag value',
      },
      '.': {
        description: 'View the package in the current directory',
      },
      '. version': {
        description:
          'Show the latest published version of the current package',
      },
    },
    options: {
      view: {
        value: '[human | json]',
        description:
          'Output format. Defaults to human-readable or json if no tty.',
      },
    },
  })

export type ViewResult = {
  /** The full packument data from the registry */
  packument: Packument
  /** The resolved manifest for the requested version */
  manifest: Manifest
  /** Security report data, if available */
  security?: PackageReportData
  /** The specific field value if a field was requested */
  fieldValue?: unknown
  /** The field path that was requested */
  fieldPath?: string
}

const formatScore = (score: number): string =>
  `${Math.round(score * 100)}/100`

const formatAlertSeverity = (
  severity: PackageAlert['severity'],
): string => {
  switch (severity) {
    case 'critical':
      return '[CRITICAL]'
    case 'high':
      return '[HIGH]'
    case 'medium':
      return '[MEDIUM]'
    case 'low':
      return '[LOW]'
    /* c8 ignore next 2 */
    default:
      return `[${String(severity).toUpperCase()}]`
  }
}

const formatSecurity = (report: PackageReportData): string => {
  const lines: string[] = []

  const { score, alerts } = report
  lines.push('')
  lines.push('security:')
  lines.push(`  score: ${formatScore(score.overall)}`)
  lines.push(`    license: ${formatScore(score.license)}`)
  lines.push(`    maintenance: ${formatScore(score.maintenance)}`)
  lines.push(`    quality: ${formatScore(score.quality)}`)
  lines.push(`    supply chain: ${formatScore(score.supplyChain)}`)
  lines.push(`    vulnerability: ${formatScore(score.vulnerability)}`)

  if (alerts.length > 0) {
    lines.push(`  alerts: ${alerts.length}`)
    for (const alert of alerts) {
      lines.push(
        `    ${formatAlertSeverity(alert.severity)} ${alert.type}: ${alert.key} (${alert.category})`,
      )
    }
  } else {
    lines.push('  alerts: none')
  }

  return lines.join('\n')
}

const formatDependencyCount = (manifest: Manifest): string[] => {
  const lines: string[] = []
  const deps = Object.keys(manifest.dependencies ?? {}).length
  const devDeps = Object.keys(manifest.devDependencies ?? {}).length
  const optDeps = Object.keys(
    manifest.optionalDependencies ?? {},
  ).length
  const peerDeps = Object.keys(manifest.peerDependencies ?? {}).length

  const parts: string[] = []
  if (deps > 0) parts.push(`${deps} dependencies`)
  if (devDeps > 0) parts.push(`${devDeps} dev`)
  if (optDeps > 0) parts.push(`${optDeps} optional`)
  if (peerDeps > 0) parts.push(`${peerDeps} peer`)

  if (parts.length > 0) {
    lines.push(`deps: ${parts.join(', ')}`)
  }

  return lines
}

const formatHuman = (result: ViewResult): string => {
  const { packument, manifest, security } = result

  const lines: string[] = []

  // Name and version
  const name = manifest.name ?? packument.name
  const version = manifest.version ?? ''
  lines.push(version ? `${name}@${version}` : name)

  // Description
  if (manifest.description) {
    lines.push(manifest.description)
  }

  lines.push('')

  // License
  if (manifest.license) {
    lines.push(`license: ${manifest.license}`)
  }

  // Homepage
  if (manifest.homepage) {
    lines.push(`homepage: ${manifest.homepage}`)
  }

  // Repository
  if (manifest.repository) {
    const repo =
      typeof manifest.repository === 'string' ?
        manifest.repository
      : manifest.repository.url
    if (repo) {
      lines.push(`repository: ${repo}`)
    }
  }

  // Author
  if (manifest.author) {
    const author =
      typeof manifest.author === 'string' ?
        manifest.author
      : manifest.author.name
    if (author) {
      lines.push(`author: ${author}`)
    }
  }

  // Keywords
  if (manifest.keywords) {
    const kw =
      Array.isArray(manifest.keywords) ?
        manifest.keywords
      : [manifest.keywords]
    if (kw.length > 0) {
      lines.push(`keywords: ${kw.join(', ')}`)
    }
  }

  // Dist-tags
  const tagEntries = Object.entries(packument['dist-tags'])
  if (tagEntries.length > 0) {
    lines.push('')
    lines.push('dist-tags:')
    for (const [tag, ver] of tagEntries) {
      lines.push(`  ${tag}: ${ver}`)
    }
  }

  // Dependencies count
  const depLines = formatDependencyCount(manifest)
  if (depLines.length > 0) {
    lines.push('')
    lines.push(...depLines)
  }

  // Maintainers
  if (packument.maintainers && packument.maintainers.length > 0) {
    lines.push('')
    lines.push('maintainers:')
    for (const m of packument.maintainers) {
      const mName = typeof m === 'string' ? m : m.name
      lines.push(`  - ${mName}`)
    }
  }

  // Published time
  if (packument.time && version && packument.time[version]) {
    lines.push('')
    lines.push(`published: ${packument.time[version]}`)
  }

  // Security info
  if (security) {
    lines.push(formatSecurity(security))
  }

  // Versions count
  const versionCount = Object.keys(packument.versions).length
  if (versionCount > 0) {
    lines.push('')
    lines.push(`versions: ${versionCount} total`)
  }

  return lines.join('\n')
}

export const views = {
  human: (result: ViewResult, _options: ViewOptions, _conf) => {
    // Field access mode: just return the value
    if (result.fieldPath !== undefined) {
      const val = result.fieldValue
      if (Array.isArray(val)) {
        return val.join('\n')
      }
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val, null, 2)
      }
      if (val === undefined || val === null) return ''
      return typeof val === 'string' ? val : JSON.stringify(val)
    }

    // Full view mode
    return formatHuman(result)
  },
  json: (result: ViewResult, _options: ViewOptions, _conf) => {
    if (result.fieldPath !== undefined) {
      return result.fieldValue
    }
    return {
      ...result.manifest,
      'dist-tags': result.packument['dist-tags'],
      time: result.packument.time,
      maintainers: result.packument.maintainers,
      ...(result.security ? { security: result.security } : {}),
    }
  },
} as const satisfies Views<ViewResult>

/**
 * Lookup fields from a combined packument+manifest view.
 *
 * The lookup searches in this order:
 * 1. Top-level packument fields (name, dist-tags, versions, time,
 *    readme, maintainers)
 * 2. Manifest fields for the resolved version
 * 3. Security data (security.score, security.alerts)
 */
const lookupField = (result: ViewResult, path: string): unknown => {
  // Special handling for packument-level fields
  const packumentFields = [
    'dist-tags',
    'versions',
    'time',
    'readme',
    'maintainers',
    'modified',
    'contributors',
  ]

  /* c8 ignore next - split always returns at least one element */
  const topLevel = path.split('.')[0] ?? path

  if (packumentFields.includes(topLevel)) {
    return dotProp.get(result.packument, path)
  }

  // Check security namespace
  if (topLevel === 'security' && result.security) {
    const subPath = path.slice('security.'.length)
    if (subPath === '' || path === 'security') {
      return result.security
    }
    return dotProp.get(result.security, subPath)
  }

  // Default: look up in manifest
  return dotProp.get(result.manifest, path)
}

const readLocalManifest = (conf: LoadedConfig) => {
  const file = conf.options.packageJson.find(process.cwd())
  if (!file) {
    throw error('No local package.json found', {
      code: 'EUSAGE',
      path: process.cwd(),
    })
  }
  const manifest = conf.options.packageJson.read(file) as Manifest
  const { name } = manifest
  if (!name) {
    throw error('No package name found in package.json', {
      code: 'EUSAGE',
      found: file,
    })
  }
  return { name, manifest }
}

// nothing published: no dist-tags or versions
const localView = (name: string, manifest: Manifest): ViewResult => ({
  manifest,
  packument: { name, 'dist-tags': {}, versions: {} },
})

const fetchView = async (
  spec: Spec,
  conf: LoadedConfig,
): Promise<ViewResult> => {
  const pic = new PackageInfoClient(conf.options)

  // Fetch the full packument (needs time, maintainers) and resolved manifest
  const [packument, resolvedManifest] = await Promise.all([
    pic.packument(spec, { full: true }),
    pic.manifest(spec),
  ])
  const manifest = resolvedManifest as Manifest

  // Try to get security data for this package
  let security: PackageReportData | undefined
  const name = manifest.name ?? packument.name
  const version = manifest.version

  if (name && version) {
    try {
      const node = createStubNode(spec, name, version, conf.options)
      const archive = await SecurityArchive.start({
        nodes: [node],
      })
      security = archive.get(node.id)
    } catch {
      // Security data is optional, don't fail the command
    }
  }

  return { packument, manifest, security }
}

export const command: CommandFn<ViewResult> = async conf => {
  // `.` (or no args) is the package in the current directory
  const specArg = conf.positionals[0] || '.'
  const fieldPath = conf.positionals[1]

  let result: ViewResult
  if (specArg === '.' || specArg.startsWith('.@')) {
    const { name, manifest } = readLocalManifest(conf)
    const rest = specArg.slice(1)
    if (manifest.private) {
      // never query the registry for private pkgs
      if (rest) {
        throw error('Cannot select a version of a private package', {
          code: 'EUSAGE',
          found: specArg,
        })
      }
      result = localView(name, manifest)
    } else {
      // keep name literal; rest is '' or '@<spec>'
      result = await fetchView(
        Spec.parse(name, rest.slice(1), conf.options),
        conf,
      )
    }
  } else {
    result = await fetchView(
      Spec.parseArgs(specArg, conf.options),
      conf,
    )
  }

  // If a field path is provided, resolve it
  if (fieldPath !== undefined) {
    result.fieldPath = fieldPath
    result.fieldValue = lookupField(result, fieldPath)
  }

  return result
}
