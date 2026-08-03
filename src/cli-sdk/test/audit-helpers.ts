import t from 'tap'
import {
  isSecuritySelector,
  buildAuditQuery,
  aggregateBySeverity,
  filterAuditResult,
} from '../src/audit-helpers.ts'

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
        insights: {
          malware: {
            critical: true,
            high: false,
            medium: false,
            low: false,
          },
        },
      },
      {
        id: 'pkg-high-id',
        name: 'pkg-high',
        version: '2.0.0',
        insights: {
          malware: {
            critical: false,
            high: true,
            medium: false,
            low: false,
          },
        },
      },
      {
        id: 'pkg-low-id',
        name: 'pkg-low',
        version: '3.0.0',
        insights: {
          severity: {
            critical: false,
            high: false,
            medium: false,
            low: true,
          },
        },
      },
    ]
    const result = aggregateBySeverity(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.equal(result.summary.high.length, 1)
    t.equal(result.summary.low.length, 1)
    t.equal(result.total, 3)
  })

  t.test('identifies direct vs transitive dependencies', async t => {
    const directNode = {
      id: 'importer-1',
      name: 'direct-pkg',
      version: '1.0.0',
      insights: {
        malware: {
          critical: false,
          high: true,
          medium: false,
          low: false,
        },
      },
    }
    const transitiveNode = {
      id: 'other-id',
      name: 'transitive-pkg',
      version: '2.0.0',
      insights: {
        malware: {
          critical: false,
          high: true,
          medium: false,
          low: false,
        },
      },
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
        insights: { squat: { critical: true, medium: false } },
      },
    ]
    const result = aggregateBySeverity(nodes, importers)
    t.equal(result.summary.critical.length, 1)
    t.ok(result.summary.critical[0])
    t.match(result.summary.critical[0]!.alerts[0], /squat/)
  })
})

t.test('filterAuditResult', async t => {
  t.test('filters out severities below minimum', async t => {
    const result = {
      summary: {
        critical: [
          { name: 'a', version: '1.0.0', alerts: [], direct: true },
        ],
        high: [
          { name: 'b', version: '1.0.0', alerts: [], direct: false },
        ],
        moderate: [
          { name: 'c', version: '1.0.0', alerts: [], direct: true },
        ],
        low: [
          { name: 'd', version: '1.0.0', alerts: [], direct: false },
        ],
      },
      total: 4,
      directCount: 2,
      indirectCount: 2,
    }

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
  })

  t.test('preserves empty result structure', async t => {
    const empty = {
      summary: { critical: [], high: [], moderate: [], low: [] },
      total: 0,
      directCount: 0,
      indirectCount: 0,
    }
    const filtered = filterAuditResult(empty, 'high')
    t.equal(filtered.total, 0)
    t.equal(filtered.directCount, 0)
    t.equal(filtered.indirectCount, 0)
  })
})
