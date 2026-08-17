import t from 'tap'
import * as Graph from '@vltpkg/graph'
import * as SecurityArchiveModule from '@vltpkg/security-archive'
import { Query } from '@vltpkg/query'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { Spec } from '@vltpkg/spec'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageAlert } from '@vltpkg/security-archive'
import type { AuditResult } from '../src/audit-helpers.ts'
import type { LoadedConfig } from '../src/config/index.ts'

// The command sets process.exitCode when it reports findings, which is
// itself under test here -- left set it also fails this suite.
t.teardown(() => {
  process.exitCode = 0
})

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
}

/**
 * One package per outcome we want to observe. Severities are written in
 * the feed's wire spelling, so `middle` rather than `medium` -- a
 * fixture using `medium` would not exercise the normalization every
 * consumer depends on.
 */
const fixtures: Record<string, PackageAlert[]> = {
  'malware-crit': [
    {
      key: 'm1',
      type: 'malware',
      severity: 'critical',
      category: 'supplyChainRisk',
    },
  ],
  'vuln-high': [
    {
      key: 'v1',
      type: 'cve',
      severity: 'high',
      category: 'vulnerability',
      props: { lastPublish: '2026-01-01', cveId: 'CVE-2026-0002' },
    },
  ],
  'vuln-mid': [
    {
      key: 'v2',
      type: 'cve',
      severity: 'middle',
      category: 'vulnerability',
    },
  ],
  'vuln-low': [
    {
      key: 'v3',
      type: 'cve',
      severity: 'low',
      category: 'vulnerability',
    },
  ],
  // :squat matches the alert types `didYouMean` and `gptDidYouMean`
  'squat-crit': [
    {
      key: 's1',
      type: 'didYouMean',
      severity: 'critical',
      category: 'supplyChainRisk',
      props: {
        lastPublish: '2026-01-01',
        alternatePackage: 'lodash',
      },
    },
  ],
  // discovered by :malware, but every alert is one the feed told us to
  // ignore, so nothing should be reported for it
  'ignored-malware': [
    {
      key: 'i1',
      type: 'malware',
      severity: 'critical',
      category: 'supplyChainRisk',
      action: 'ignore',
    },
  ],
  // a low-severity finding that CISA lists as actively exploited
  'kev-low': [
    {
      key: 'k1',
      type: 'cve',
      severity: 'low',
      category: 'vulnerability',
      props: {
        lastPublish: '2026-01-01',
        cveId: 'CVE-2026-0009',
        kevs: [{ id: 'CVE-2026-0009' }],
      },
    },
  ],
  // `squatting`/`troll` are typosquat types that :squat does NOT match
  'squatting-only': [
    {
      key: 'q1',
      type: 'squatting',
      severity: 'critical',
      category: 'supplyChainRisk',
    },
  ],
  clean: [],
}

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
  dependencies: Object.fromEntries(
    Object.keys(fixtures).map(name => [name, '^1.0.0']),
  ),
}

const graph = new Graph.Graph({
  projectRoot: t.testdirName,
  ...specOptions,
  mainManifest,
})

const archive = new Map<
  DepID,
  { score: object; alerts: PackageAlert[] }
>()
for (const [name, alerts] of Object.entries(fixtures)) {
  const node = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse(name, '^1.0.0', specOptions),
    { name, version: '1.0.0' },
  )!
  if (alerts.length > 0) archive.set(node.id, { score: {}, alerts })
}

/**
 * `Query` wants a whole `SecurityArchiveLike`, not just the `get` that
 * `aggregateBySeverity` needs, so the unused half of the interface is
 * stubbed rather than cast away.
 */
const securityArchive = {
  ok: true,
  get: (id: DepID) => archive.get(id),
  set: () => {},
  delete: () => {},
  has: (id: DepID) => archive.has(id),
  clear: () => {},
} as unknown as SecurityArchiveModule.SecurityArchiveLike

/**
 * The audit command with the *real* DSS query engine. Only the graph
 * loader and the archive are mocked, so these tests exercise selector
 * matching, aggregation, filtering and rendering as one pipeline --
 * the existing command tests stub `Query` and cannot.
 */
const Command = await t.mockImport<
  typeof import('../src/commands/audit.ts')
>('../src/commands/audit.ts', {
  '@vltpkg/graph': t.createMock(Graph, {
    actual: { load: () => graph },
  }),
  '@vltpkg/security-archive': {
    ...SecurityArchiveModule,
    SecurityArchive: {
      async start() {
        return securityArchive
      },
    },
  },
})

const options = {
  scurry: new PathScurry(),
  packageJson: new PackageJson(),
  projectRoot: t.testdirName,
}
options.packageJson.read = () => graph.mainImporter.manifest!

/** Run `vlt audit`, omitting --audit-level entirely when undefined. */
const audit = async (level?: string): Promise<AuditResult> => {
  const values: Record<string, unknown> = { view: 'json' }
  if (level !== undefined) values['audit-level'] = level
  process.exitCode = 0
  return Command.command({
    options,
    positionals: [],
    values,
    get: (key: string) => values[key],
  } as unknown as LoadedConfig)
}

/** Every package name reported, across all severity buckets. */
const reported = (result: AuditResult): string[] =>
  Object.values(result.summary)
    .flat()
    .map(pkg => pkg.name)
    .sort()

/** The bucket a package landed in, or undefined if unreported. */
const bucketOf = (
  result: AuditResult,
  name: string,
): string | undefined =>
  Object.entries(result.summary).find(([, pkgs]) =>
    pkgs.some(pkg => pkg.name === name),
  )?.[0]

t.test('vlt audit with no --audit-level', async t => {
  const result = await audit()

  t.strictSame(
    reported(result),
    [
      'kev-low',
      'malware-crit',
      'squat-crit',
      'vuln-high',
      'vuln-low',
      'vuln-mid',
    ],
    'defaults to low, so findings at every severity are reported',
  )

  t.equal(
    bucketOf(result, 'malware-crit'),
    'critical',
    'malware is bucketed at its own severity',
  )
  t.equal(bucketOf(result, 'vuln-high'), 'high')
  t.equal(
    bucketOf(result, 'vuln-mid'),
    'medium',
    'the wire spelling `middle` normalizes to the medium bucket',
  )
  t.equal(bucketOf(result, 'vuln-low'), 'low')
  t.equal(bucketOf(result, 'squat-crit'), 'critical')

  t.equal(
    bucketOf(result, 'ignored-malware'),
    undefined,
    'a package whose every alert is action:ignore drops out entirely',
  )
  t.equal(
    bucketOf(result, 'clean'),
    undefined,
    'a package with no alerts is never reported',
  )

  t.equal(result.total, 6)
  t.equal(
    result.directCount,
    6,
    'all fixtures are declared by the importer, so all are direct',
  )
  t.equal(result.indirectCount, 0)
  t.equal(process.exitCode, 1, 'exits non-zero when findings exist')
})

t.test('vlt audit --audit-level raises the floor', async t => {
  // Each level reports the findings at or above it. Two things to read
  // carefully: squat-crit is critical, so it survives every level; and
  // kev-low is a *low* finding that survives medium and high because
  // CISA KEV findings are exempt from the severity floor. vuln-low is
  // the control -- same severity, no KEV entry, dropped above low.
  const expected: Record<string, string[]> = {
    low: [
      'kev-low',
      'malware-crit',
      'squat-crit',
      'vuln-high',
      'vuln-low',
      'vuln-mid',
    ],
    medium: [
      'kev-low',
      'malware-crit',
      'squat-crit',
      'vuln-high',
      'vuln-mid',
    ],
    high: ['kev-low', 'malware-crit', 'squat-crit', 'vuln-high'],
    // kev-low is absent here, and not because the filter dropped it --
    // see the actively-exploited test below
    critical: ['malware-crit', 'squat-crit'],
  }

  for (const [level, names] of Object.entries(expected)) {
    const result = await audit(level)
    t.strictSame(
      reported(result),
      names,
      `--audit-level=${level} reports exactly ${names.length} packages`,
    )
    t.equal(
      result.total,
      names.length,
      `--audit-level=${level} total matches what is shown`,
    )
    t.equal(
      result.directCount + result.indirectCount,
      result.total,
      `--audit-level=${level} recomputes the direct/transitive split`,
    )
  }
})

t.test('vlt audit --audit-level=moderate', async t => {
  const moderate = await audit('moderate')
  const medium = await audit('medium')
  const low = await audit('low')

  t.strictSame(
    reported(moderate),
    reported(medium),
    'moderate is an alias for medium',
  )
  t.notSame(
    reported(moderate),
    reported(low),
    'and is not silently treated as the low default',
  )
  t.notOk(
    reported(moderate).includes('vuln-low'),
    'so a low-severity finding is not reported under moderate',
  )
})

t.test('vlt audit with an unusable --audit-level', async t => {
  const bogus = await audit('catastrophic')
  const low = await audit('low')
  t.strictSame(
    reported(bogus),
    reported(low),
    'falls back to the low default rather than reporting nothing',
  )
})

t.test('vlt audit exit code with no findings', async t => {
  const emptyGraph = new Graph.Graph({
    projectRoot: t.testdirName,
    ...specOptions,
    mainManifest: { name: 'empty', version: '1.0.0' },
  })
  const EmptyCommand = await t.mockImport<
    typeof import('../src/commands/audit.ts')
  >('../src/commands/audit.ts', {
    '@vltpkg/graph': t.createMock(Graph, {
      actual: { load: () => emptyGraph },
    }),
    '@vltpkg/security-archive': {
      ...SecurityArchiveModule,
      SecurityArchive: {
        async start() {
          return { ok: true, get: () => undefined }
        },
      },
    },
  })
  const emptyOptions = {
    scurry: new PathScurry(),
    packageJson: new PackageJson(),
    projectRoot: t.testdirName,
  }
  emptyOptions.packageJson.read = () =>
    emptyGraph.mainImporter.manifest!

  process.exitCode = 0
  const values = { view: 'json' as const }
  const result = await EmptyCommand.command({
    options: emptyOptions,
    positionals: [],
    values,
    get: (key: string) => (values as Record<string, unknown>)[key],
  } as unknown as LoadedConfig)

  t.equal(result.total, 0)
  t.equal(process.exitCode, 0, 'exits zero when nothing is reported')
})

t.test('DSS security selectors', async t => {
  const search = async (query: string): Promise<string[]> => {
    const q = new Query({
      edges: graph.edges,
      nodes: new Set(graph.nodes.values()),
      importers: graph.importers,
      securityArchive,
    })
    const { nodes } = await q.search(query, {
      signal: new AbortController().signal,
    })
    return nodes
      .map(node => node.name)
      .filter((name): name is string => !!name)
      .sort()
  }

  t.test(':malware matches any malware alert', async t => {
    t.strictSame(
      await search(':malware'),
      ['ignored-malware', 'malware-crit'],
      'the selector matches on alert type and does not apply the ignore policy -- that happens when the audit reads the alerts',
    )
  })

  t.test(':malware takes no severity parameter', async t => {
    await t.rejects(
      search(':malware(critical)'),
      'a parameterised form is an error, which is why the audit query carries :malware unqualified at every level',
    )
  })

  t.test(':severity grades from the severity field', async t => {
    t.strictSame(
      await search(':severity(critical)'),
      [],
      'no fixture carries a critical CVE',
    )
    t.strictSame(
      await search(':severity(<=high)'),
      ['vuln-high'],
      'high and above',
    )
    t.strictSame(
      await search(':severity(<=medium)'),
      ['vuln-high', 'vuln-mid'],
      'the `middle` wire spelling is graded as medium',
    )
    t.strictSame(
      await search(':severity(<=low)'),
      ['kev-low', 'vuln-high', 'vuln-low', 'vuln-mid'],
      'everything in the vulnerability category',
    )
  })

  t.test(':severity ignores non-vulnerability alerts', async t => {
    const all = await search(':severity(<=low)')
    t.notOk(
      all.includes('malware-crit'),
      'a critical malware alert is not a vulnerability, so :severity alone would miss it',
    )
  })

  t.test(':squat matches impersonation types', async t => {
    t.strictSame(await search(':squat'), ['squat-crit'])
    t.strictSame(await search(':squat(critical)'), ['squat-crit'])
  })

  t.test(
    ':squat does not match the `squatting` alert type',
    async t => {
      // kindsMap in src/query/src/pseudo/squat.ts maps critical to
      // `didYouMean` and medium to `gptDidYouMean` only, while audit's
      // own impersonation set also includes `squatting` and `troll`.
      // A package carrying only `squatting` is therefore reportable but
      // not discoverable -- a concrete case of discovery being narrower
      // than reporting.
      t.notOk(
        (await search(':squat')).includes('squatting-only'),
        'so a squatting-only package never reaches the audit',
      )
    },
  )

  t.test('the audit query finds every reportable class', async t => {
    // What `buildAuditQuery('low')` emits. Asserted through the engine
    // rather than as a string, so this fails if selector semantics
    // change under us even when the query text does not.
    t.strictSame(
      await search(':malware, :vulnerable, :severity(<=low), :squat'),
      [
        'ignored-malware',
        'kev-low',
        'malware-crit',
        'squat-crit',
        'vuln-high',
        'vuln-low',
        'vuln-mid',
      ],
      'malware, vulnerabilities and typosquats in one pass',
    )
  })
})

t.test('actively exploited findings and --audit-level', async t => {
  const low = await audit('low')
  const kev = low.summary.low.find(pkg => pkg.name === 'kev-low')
  t.ok(kev, 'the KEV finding is reported at the default level')
  t.equal(
    kev?.alerts[0]?.severity,
    'low',
    'its severity is not rewritten -- the feed graded it low and we do not second-guess that',
  )

  // The exemption is real: at --audit-level=high a low-graded KEV
  // finding survives, while vuln-low -- same severity, no KEV entry --
  // does not. So a CI gate cannot silently discard something being
  // exploited right now.
  const high = await audit('high')
  t.ok(
    reported(high).includes('kev-low'),
    'a low-graded KEV finding survives --audit-level=high',
  )
  t.notOk(
    reported(high).includes('vuln-low'),
    'while an equally low finding without a KEV entry is dropped',
  )

  // But the exemption lives in filterAuditResult, which only ever sees
  // what the DSS query surfaced. At --audit-level=critical the query
  // narrows to `:severity(critical)`/`:vuln(critical)`, which a
  // low-graded CVE does not satisfy, so the finding is never discovered
  // and never reaches the filter to be exempted.
  const critical = await audit('critical')
  t.notOk(
    reported(critical).includes('kev-low'),
    'at --audit-level=critical it is lost to discovery, not to filtering -- the exemption cannot protect what the query did not return',
  )
})
