import t from 'tap'
import {
  isSecuritySelector,
  buildAuditQuery,
  aggregateBySeverity,
  filterAuditResult,
  formatAuditSummary,
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

/** AuditPackage fixture, for tests that don't care about identity. */
const makePkg = (
  overrides: Partial<AuditPackage> = {},
): AuditPackage => ({
  name: 'pkg',
  version: '1.0.0',
  alerts: [],
  direct: false,
  ...overrides,
})

const emptySummary = () => ({
  critical: [] as AuditPackage[],
  high: [] as AuditPackage[],
  moderate: [] as AuditPackage[],
  low: [] as AuditPackage[],
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

t.test('buildAuditQuery', async t => {
  t.test('returns full query for low level', async t => {
    const q = buildAuditQuery('low')
    t.match(q, /:malware/)
    t.match(q, /:vulnerable/)
    t.match(q, /:severity/)
    t.match(q, /:scripts/)
    t.match(q, /:squat/)
  })

  t.test('returns filtered query for moderate level', async t => {
    const q = buildAuditQuery('moderate')
    t.match(q, /:malware/)
    t.match(q, /:severity/)
    t.notMatch(q, /:scripts/)
  })

  t.test('returns filtered query for high level', async t => {
    const q = buildAuditQuery('high')
    t.match(q, /:malware/)
    t.match(q, /:severity/)
  })

  t.test('returns filtered query for critical level', async t => {
    const q = buildAuditQuery('critical')
    t.match(q, /:malware\(critical\)/)
    t.match(q, /:severity\(critical\)/)
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

  t.test('identifies direct vs transitive dependencies', async t => {
    const directNode = {
      id: 'importer-1',
      name: 'direct-pkg',
      version: '1.0.0',
      insights: { malware: leveled({ high: true }) },
    }
    const transitiveNode = {
      id: 'other-id',
      name: 'transitive-pkg',
      version: '2.0.0',
      insights: { malware: leveled({ high: true }) },
    }
    const result = aggregateBySeverity(
      [directNode, transitiveNode],
      importers,
    )
    t.equal(result.directCount, 1)
    t.equal(result.indirectCount, 1)
    t.ok(result.summary.high[0])
    t.ok(result.summary.high[1])
    t.equal(result.summary.high[0]!.direct, true)
    t.equal(result.summary.high[1]!.direct, false)
  })

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
    t.equal(high.directCount, 2)
    t.equal(high.indirectCount, 2)

    const moderate = filterAuditResult(result, 'moderate')
    t.equal(moderate.total, 3)
    t.equal(moderate.summary.critical.length, 1)
    t.equal(moderate.summary.high.length, 1)
    t.equal(moderate.summary.moderate.length, 1)
    t.equal(moderate.summary.low.length, 0)

    const critical = filterAuditResult(result, 'critical')
    t.equal(critical.total, 1)
    t.equal(critical.summary.critical.length, 1)
    t.equal(critical.summary.high.length, 0)
    t.equal(critical.summary.moderate.length, 0)
    t.equal(critical.summary.low.length, 0)

    const low = filterAuditResult(result, 'low')
    t.equal(low.total, 4)
    t.equal(low.summary.critical.length, 1)
    t.equal(low.summary.high.length, 1)
    t.equal(low.summary.moderate.length, 1)
    t.equal(low.summary.low.length, 1)
  })

  t.test('preserves empty result structure', async t => {
    const filtered = filterAuditResult(makeResult(), 'high')
    t.equal(filtered.total, 0)
    t.equal(filtered.directCount, 0)
    t.equal(filtered.indirectCount, 0)
  })
})

t.test('formatAuditSummary', async t => {
  t.test('returns zero issues message', async t => {
    t.equal(
      formatAuditSummary(makeResult()),
      'found 0 security issues\n',
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
    t.match(output, /^found 1 security issue\n/)
    t.match(output, /high \(1\)/)
    t.match(output, /pkg-a@1\.0\.0/)
    t.match(output, /malware: high/)
    t.match(output, /1 direct dependency, 0 transitive/)
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
      t.match(output, /^found 2 security issues\n/)
      t.match(output, /critical \(1\)/)
      t.match(output, /high \(1\)/)
      t.match(output, /1 direct dependency, 1 transitive/)
      t.ok(
        output.indexOf('critical (1)') < output.indexOf('high (1)'),
        'critical section renders before high section',
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
})
