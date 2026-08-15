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
} from '../src/audit-helpers.ts'
import type {
  AuditPackage,
  AuditResult,
} from '../src/audit-helpers.ts'

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
    // every level -- if it's missing at moderate/high/critical, the
    // DSS query drops malware-only findings before they ever reach
    // aggregateBySeverity, regardless of --audit-level.
    for (const level of ['low', 'moderate', 'high', 'critical']) {
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
    for (const level of ['low', 'moderate', 'high', 'critical']) {
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
    for (const level of ['low', 'moderate', 'high', 'critical']) {
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

  t.test('returns filtered query for moderate level', async t => {
    const q = buildAuditQuery('moderate')
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
    const result = aggregateBySeverity(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.equal(result.summary.high.length, 1)
    t.equal(result.summary.low.length, 1)
    t.equal(result.total, 3)
  })

  t.test(
    'groups leveled insights with medium severity as moderate',
    async t => {
      const nodes = [
        {
          id: 'pkg-medium-id',
          name: 'pkg-medium',
          version: '1.0.0',
          insights: { severity: leveled({ medium: true }) },
        },
      ]
      const result = aggregateBySeverity(nodes, importers)
      t.equal(result.summary.moderate.length, 1)
      t.match(
        result.summary.moderate[0]?.alerts[0],
        /severity: moderate/,
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
    const result = aggregateBySeverity(nodes, importers)
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
    const result = aggregateBySeverity(nodes, importers)
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
    const result = aggregateBySeverity(
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
      const result = aggregateBySeverity(nodes, importers)
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
      const result = aggregateBySeverity(nodes, importers)
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
    const result = aggregateBySeverity(nodes, importers)
    t.equal(result.total, 0)
  })

  t.test('handles empty input', async t => {
    const result = aggregateBySeverity([], importers)
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
      const result = aggregateBySeverity(nodes, malformedImporters)
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
    const result = aggregateBySeverity(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.ok(result.summary.critical[0])
    t.match(result.summary.critical[0]!.alerts[0], /squat/)
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
    const result = aggregateBySeverity(nodes, importers)
    t.equal(result.summary.moderate.length, 1)
    t.ok(result.summary.moderate[0])
    t.match(result.summary.moderate[0]!.alerts[0], /squat/)
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
      const result = aggregateBySeverity(nodes, importers)
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
      const result = aggregateBySeverity(nodes, importers)
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
      const result = aggregateBySeverity(nodes, importers)
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
    const result = aggregateBySeverity(nodes, importers, message =>
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
      aggregateBySeverity(nodes, importers, message =>
        warnings.push(message),
      )
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
      const result = aggregateBySeverity(nodes, importers)
      t.equal(result.total, 1)
      t.equal(result.summary.critical.length, 1)
      t.equal(result.summary.high.length, 0)
      const pkg = result.summary.critical[0]
      t.ok(pkg)
      t.equal(pkg!.alerts.length, 3)
      t.match(pkg!.alerts[0], /malware: high/)
      t.match(pkg!.alerts[1], /severity: critical/)
      t.match(pkg!.alerts[2], /squat: moderate/)
    },
  )

  t.test('defaults name and version when missing', async t => {
    const nodes = [
      {
        id: 'no-name-id',
        insights: { malware: leveled({ critical: true }) },
      },
    ]
    const result = aggregateBySeverity(nodes, importers)
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
        moderate: [makePkg({ name: 'c', direct: true })],
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
    t.equal(high.summary.moderate.length, 0)
    t.equal(high.summary.low.length, 0)
    // recomputed from a (direct) and b (transitive) only, not the
    // pre-filter totals covering all four packages
    t.equal(high.directCount, 1)
    t.equal(high.indirectCount, 1)

    const moderate = filterAuditResult(result, 'moderate')
    t.equal(moderate.total, 3)
    t.equal(moderate.summary.critical.length, 1)
    t.equal(moderate.summary.high.length, 1)
    t.equal(moderate.summary.moderate.length, 1)
    t.equal(moderate.summary.low.length, 0)
    t.equal(moderate.directCount, 2)
    t.equal(moderate.indirectCount, 1)

    const critical = filterAuditResult(result, 'critical')
    t.equal(critical.total, 1)
    t.equal(critical.summary.critical.length, 1)
    t.equal(critical.summary.high.length, 0)
    t.equal(critical.summary.moderate.length, 0)
    t.equal(critical.summary.low.length, 0)
    t.equal(critical.directCount, 1)
    t.equal(critical.indirectCount, 0)

    const low = filterAuditResult(result, 'low')
    t.equal(low.total, 4)
    t.equal(low.summary.critical.length, 1)
    t.equal(low.summary.high.length, 1)
    t.equal(low.summary.moderate.length, 1)
    t.equal(low.summary.low.length, 1)
    t.equal(low.directCount, 2)
    t.equal(low.indirectCount, 2)
  })

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
    t.equal(formatSeverityHeading('moderate', 3), 'moderate (3)')
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
            makePkg({ name: 'a', alerts: ['malware: critical'] }),
          ],
          high: [
            makePkg({
              name: 'b',
              alerts: ['severity: high', 'squat: high'],
            }),
          ],
          moderate: [
            makePkg({ name: 'c', alerts: ['squat: moderate'] }),
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
            alerts: ['malware: high'],
            direct: true,
          }),
        ],
      },
      total: 1,
      directCount: 1,
      indirectCount: 0,
    })
    const output = formatAuditSummary(result)
    t.match(output, /^1 package with security issues\n/)
    t.match(output, /^1 malware$/m)
    t.match(output, /^1 high$/m)
    t.match(output, /high\s+pkg-a@1\.0\.0\s+malware: high/)
    t.match(output, /1 direct dependency, 0 transitive/)
    t.ok(
      output.indexOf('1 direct dependency') <
        output.indexOf('pkg-a@1.0.0'),
      'direct/transitive breakdown renders before the rows',
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
            alerts: ['severity: high'],
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
              alerts: ['malware: critical'],
            }),
          ],
          high: [
            makePkg({
              name: 'pkg-h',
              alerts: ['severity: high'],
              direct: true,
            }),
          ],
        },
        total: 2,
        directCount: 1,
        indirectCount: 1,
      })
      const output = formatAuditSummary(result)
      t.match(output, /^2 packages with security issues\n/)
      t.match(output, /^1 malware, 1 vulnerable$/m)
      t.match(output, /^1 critical, 1 high$/m)
      t.match(output, /critical\s+pkg-c@2\.0\.0\s+malware: critical/)
      t.match(output, /high\s+pkg-h@1\.0\.0\s+severity: high/)
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
              alerts: ['malware: high', 'severity: high'],
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
      // "text (url)" fallback used when colors is false.
      t.match(
        output,
        /\x1b]8;;https:\/\/nvd\.nist\.gov\/vuln\/detail\/CVE-2021-1234\x1b\\CVE-2021-1234/,
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
    const result = aggregateBySeverity(nodes)
    t.equal(result.total, 1, 'counts vuln-only package')
    t.equal(result.summary.critical.length, 1, 'reports in critical bucket')
  })
})
