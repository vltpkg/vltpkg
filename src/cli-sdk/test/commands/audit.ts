import t from 'tap'
import { PathScurry } from 'path-scurry'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Test } from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type {
  AuditResult,
  AuditFinding,
} from '../../src/commands/audit.ts'
import type { Insights } from '@vltpkg/query'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"location": ".*"/gm, '$1"location": "{LOC}"')

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
  dependencies: {
    foo: '^1.0.0',
    bar: '^1.0.0',
    baz: '^1.0.0',
    qux: '^1.0.0',
    clean: '^1.0.0',
  },
}

const buildGraph = () => {
  const graph = new Graph.Graph({
    projectRoot: t.testdirName,
    ...specOptions,
    mainManifest,
  })
  for (const name of ['foo', 'bar', 'baz', 'qux', 'clean']) {
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse(name, '^1.0.0', specOptions),
      { name, version: '1.0.0' },
    )
  }
  return graph
}

const score = {
  overall: 0.5,
  license: 0.5,
  maintenance: 0.5,
  quality: 0.5,
  supplyChain: 0.5,
  vulnerability: 0.5,
}

// keyed by package name; matched against the node's DepID string
const reports: Record<
  string,
  { score: typeof score; alerts: any[] }
> = {
  foo: {
    score,
    alerts: [
      { type: 'malware', severity: 'critical', category: 'malware' },
      {
        type: 'cve',
        severity: 'high',
        category: 'vulnerability',
        props: { cveId: 'CVE-2023-1', cwes: [{ id: 'CWE-79' }] },
      },
    ],
  },
  bar: {
    score,
    alerts: [
      {
        type: 'deprecated',
        severity: 'low',
        category: 'maintenance',
      },
    ],
  },
  baz: {
    score,
    alerts: [
      {
        type: 'copyleftLicense',
        severity: 'low',
        category: 'license',
      },
    ],
  },
  qux: {
    score,
    alerts: [
      { type: 'usesEval', severity: 'low', category: 'capability' },
    ],
  },
}

const reportFor = (id: string) => {
  for (const [name, report] of Object.entries(reports)) {
    if (id.includes(`${name}@`)) return report
  }
  return undefined
}

const securityArchive = {
  ok: true,
  has: (id: string) => !!reportFor(id),
  get: (id: string) => reportFor(id),
}

const mockAudit = async (
  t: Test,
  { graph = buildGraph() }: { graph?: Graph.Graph } = {},
) =>
  t.mockImport<typeof import('../../src/commands/audit.ts')>(
    '../../src/commands/audit.ts',
    {
      '@vltpkg/graph': t.createMock(Graph, {
        actual: { load: () => graph },
      }),
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return securityArchive
          },
        },
      },
    },
  )

const makeConfig = ({
  positionals = [],
  values = {},
  hasManifest = true,
}: {
  positionals?: string[]
  values?: Partial<LoadedConfig['values']>
  hasManifest?: boolean
} = {}): LoadedConfig => {
  const packageJson = new PackageJson()
  packageJson.maybeRead = () =>
    hasManifest ? mainManifest : undefined
  return {
    positionals,
    values,
    get: (key: string) => (values as Record<string, unknown>)[key],
    options: {
      ...specOptions,
      projectRoot: t.testdirName,
      scurry: new PathScurry(),
      packageJson,
    },
  } as unknown as LoadedConfig
}

t.test('usage', async t => {
  const Command = await mockAudit(t)
  t.matchSnapshot(Command.usage().usage(), 'should have usage')
})

t.test('insightsToFindings', async t => {
  const { insightsToFindings } = await mockAudit(t)

  const base: Insights = { scanned: true }
  t.strictSame(
    insightsToFindings(base),
    [],
    'no insights means no findings',
  )

  const kitchenSink: Insights = {
    scanned: true,
    malware: { low: true, medium: true, high: true, critical: true },
    severity: {
      low: false,
      medium: false,
      high: false,
      critical: true,
    },
    cve: ['CVE-2020-1'],
    cwe: ['CWE-79'],
    squat: { medium: false, critical: true },
    confused: true,
    obfuscated: true,
    suspicious: true,
    undesirable: true,
    entropic: true,
    minified: true,
    license: {
      unlicensed: true,
      misc: true,
      restricted: true,
      ambiguous: true,
      copyleft: true,
      unknown: true,
      none: true,
      exception: false,
    },
    deprecated: true,
    abandoned: true,
    unmaintained: true,
    unpopular: true,
    unstable: true,
    unknown: true,
    trivial: true,
    eval: true,
    shell: true,
    network: true,
    fs: true,
    env: true,
    dynamic: true,
    debug: true,
    native: true,
    tracker: true,
    scripts: true,
    shrinkwrap: true,
  }
  t.matchSnapshot(
    insightsToFindings(kitchenSink),
    'covers every finding branch',
  )

  const highSev: Insights = {
    scanned: true,
    severity: {
      low: false,
      medium: false,
      high: true,
      critical: false,
    },
  }
  t.equal(
    insightsToFindings(highSev)[0]?.severity,
    'high',
    'high severity vulnerability',
  )

  const medSev: Insights = {
    scanned: true,
    severity: {
      low: false,
      medium: true,
      high: false,
      critical: false,
    },
    squat: { medium: true, critical: false },
  }
  const medFindings = insightsToFindings(medSev)
  t.equal(
    medFindings[0]?.severity,
    'medium',
    'potential vulnerability',
  )
  t.ok(
    medFindings.some(f => f.category === 'typosquat'),
    'possible typosquat',
  )

  const lowSev: Insights = {
    scanned: true,
    severity: {
      low: true,
      medium: false,
      high: false,
      critical: false,
    },
  }
  t.equal(
    insightsToFindings(lowSev)[0]?.severity,
    'low',
    'low severity vulnerability',
  )

  const cveOnly: Insights = { scanned: true, cve: ['CVE-2021-9'] }
  const cveFinding = insightsToFindings(cveOnly)[0]
  t.equal(cveFinding?.severity, 'high', 'bare cve treated as high')
  t.match(
    cveFinding?.description,
    /CVE-2021-9/,
    'includes the cve id',
  )
})

t.test('command - no project manifest', async t => {
  const Command = await mockAudit(t)
  const res = await Command.command(
    makeConfig({ hasManifest: false }),
  )
  t.equal(res.packagesAffected, 0, 'nothing to audit')
  t.equal(res.packagesScanned, 0, 'nothing scanned')
})

t.test('command - default audit', async t => {
  const Command = await mockAudit(t)
  const res = await Command.command(makeConfig())

  t.equal(res.queryString, ':scanned', 'defaults to :scanned')
  t.equal(res.packagesScanned, 4, 'foo, bar, baz and qux are scanned')
  t.strictSame(
    res.reports.map(r => r.name),
    ['foo', 'bar', 'baz'],
    'sorted by severity then name, qux (low only) omitted',
  )
  t.equal(res.summary.critical, 1)
  t.equal(res.summary.high, 1)
  t.equal(res.summary.medium, 2)
  t.equal(res.summary.low, 0)

  t.matchSnapshot(Command.views.json(res), 'json view')
  t.matchSnapshot(
    Command.views.human(res, { colors: false }),
    'human view (no colors)',
  )
  t.matchSnapshot(
    Command.views.human(res, { colors: true }),
    'human view (colors)',
  )
  t.matchSnapshot(
    Command.views.human(res),
    'human view (default opts)',
  )
})

t.test('command - include low severity with --all', async t => {
  const Command = await mockAudit(t)
  const res = await Command.command(
    makeConfig({ values: { all: true } }),
  )
  t.equal(res.showAll, true)
  t.equal(res.summary.low, 1, 'qux eval capability included')
  t.strictSame(
    res.reports.map(r => r.name),
    ['foo', 'bar', 'baz', 'qux'],
    'qux now included',
  )
  t.matchSnapshot(
    Command.views.human(res, { colors: false }),
    'human view with low severity findings',
  )
})

t.test('command - positional query', async t => {
  const Command = await mockAudit(t)
  const res = await Command.command(
    makeConfig({ positionals: ['#foo'] }),
  )
  t.equal(res.queryString, '#foo', 'uses the provided query')
  t.strictSame(
    res.reports.map(r => r.name),
    ['foo'],
    'only audits the queried package',
  )
})

t.test('human view - no findings', async t => {
  const Command = await mockAudit(t)

  const singular: AuditResult = {
    reports: [],
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    packagesAffected: 0,
    packagesScanned: 1,
    queryString: ':scanned',
    showAll: false,
  }
  t.matchSnapshot(
    Command.views.human(singular, { colors: false }),
    'no issues, one package scanned',
  )

  const plural: AuditResult = { ...singular, packagesScanned: 0 }
  t.matchSnapshot(
    Command.views.human(plural, { colors: true }),
    'no issues, zero packages scanned',
  )
})

t.test('human view - all severities, no version', async t => {
  const Command = await mockAudit(t)
  const finding = (
    severity: AuditFinding['severity'],
  ): AuditFinding => ({
    severity,
    category: 'test',
    description: `${severity} issue`,
  })
  const res: AuditResult = {
    reports: [
      {
        id: 'sole',
        name: 'sole',
        worst: 'critical',
        findings: [
          finding('critical'),
          finding('high'),
          finding('medium'),
          finding('low'),
        ],
      },
    ],
    summary: { critical: 1, high: 1, medium: 1, low: 1, total: 4 },
    packagesAffected: 1,
    packagesScanned: 1,
    queryString: ':scanned',
    showAll: true,
  }
  t.matchSnapshot(
    Command.views.human(res, { colors: true }),
    'renders every severity level without a version',
  )
})
