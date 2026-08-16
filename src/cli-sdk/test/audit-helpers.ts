import t from 'tap'
import {
  isSecuritySelector,
  isSecurityAuditSelector,
  buildAuditQuery,
  emptyAuditResult,
  emptySummary,
  severityOrder,
  isNodeWithId,
  isNodeWithEdgesOut,
  isNodeWithInsights,
  isLeveledInsights,
  isSquatInsights,
} from '../src/audit-helpers.ts'

t.test('isSecuritySelector - detects security-related selectors', async t => {
  t.test('matches :malware selector', async t => {
    t.ok(isSecuritySelector(':malware'), 'exact :malware')
    t.ok(
      isSecuritySelector('[name="foo"]:malware'),
      'combined with other selectors'
    )
    t.ok(isSecuritySelector('root > :malware'), 'with traversal')
  })

  t.test('matches :vuln selector', async t => {
    t.ok(isSecuritySelector(':vuln'), 'exact :vuln')
    t.ok(isSecuritySelector(':vuln(<=high)'), ':vuln with comparator')
    t.ok(
      isSecuritySelector(':vuln(<=low), :malware'),
      'combined with other security selectors'
    )
  })

  t.test('matches :vulnerable selector', async t => {
    t.ok(isSecuritySelector(':vulnerable'), 'exact :vulnerable')
  })

  t.test('matches :severity selector', async t => {
    t.ok(isSecuritySelector(':severity'), 'exact :severity')
    t.ok(isSecuritySelector(':severity(<=high)'), ':severity with comparator')
  })

  t.test('matches :cve selector', async t => {
    t.ok(isSecuritySelector(':cve'), ':cve selector')
  })

  t.test('matches :cwe selector', async t => {
    t.ok(isSecuritySelector(':cwe'), ':cwe selector')
  })

  t.test('matches :squat selector', async t => {
    t.ok(isSecuritySelector(':squat'), 'exact :squat')
    t.ok(isSecuritySelector(':squat(critical)'), ':squat with severity')
  })

  t.test('security selector does not include generic script queries', async t => {
    // Note: :scripts selector in DSS matches all nodes with lifecycle scripts (install,
    // preinstall, postinstall, prepare, etc). Since it can't distinguish between
    // security-critical scripts and legitimate build/test scripts, it's excluded from
    // security selectors to avoid false positives.
    t.notOk(
      isSecuritySelector(':scripts'),
      ':scripts selector is excluded (cannot distinguish script types)'
    )
  })

  t.test('does NOT match non-security selectors', async t => {
    t.notOk(isSecuritySelector('[name="foo"]'), 'name selector')
    t.notOk(isSecuritySelector('[version="1.0.0"]'), 'version selector')
    t.notOk(isSecuritySelector(':dev'), 'lifecycle selector')
    t.notOk(isSecuritySelector('root > child'), 'traversal only')
    t.notOk(isSecuritySelector(':scripts'), 'generic :scripts (not security-critical)')
    t.notOk(isSecuritySelector(':scripts, [name="foo"]'), ':scripts with non-security selector')
    t.notOk(isSecuritySelector(':attr(scripts, [test])'), 'test script (not security-critical)')
  })

  t.test('edge cases', async t => {
    t.notOk(isSecuritySelector(''), 'empty string')
    t.notOk(isSecuritySelector('   '), 'whitespace only')
    t.notOk(isSecuritySelector('malware'), 'without colon prefix')
    t.ok(isSecuritySelector('some text :malware more'), 'embedded in larger string')
  })
})

t.test(
  'isSecurityAuditSelector - detects genuine audit intent (excludes standalone :scripts)',
  async t => {
    t.test('matches security selectors', async t => {
      t.ok(isSecurityAuditSelector(':malware'), ':malware')
      t.ok(isSecurityAuditSelector(':vuln'), ':vuln')
      t.ok(isSecurityAuditSelector(':vulnerable'), ':vulnerable')
      t.ok(isSecurityAuditSelector(':severity'), ':severity')
      t.ok(isSecurityAuditSelector(':cve'), ':cve')
      t.ok(isSecurityAuditSelector(':cwe'), ':cwe')
      t.ok(isSecurityAuditSelector(':squat'), ':squat')
    })

    t.test('excludes generic lifecycle scripts', async t => {
      t.notOk(
        isSecurityAuditSelector(':scripts'),
        ':scripts alone is not a security audit'
      )
      t.notOk(
        isSecurityAuditSelector(':scripts, [name="foo"]'),
        ':scripts combined with non-security selector'
      )
    })

    t.test('edge cases', async t => {
      t.notOk(isSecurityAuditSelector(''), 'empty string')
      t.notOk(isSecurityAuditSelector('   '), 'whitespace only')
      t.notOk(isSecurityAuditSelector('scripts'), 'without colon prefix')
    })
  }
)

t.test('buildAuditQuery - generates DSS query strings for audit levels', async t => {
  t.test('low level audit query', async t => {
    const query = buildAuditQuery('low')
    t.match(query, /:malware/, 'includes :malware (binary, unqualified)')
    t.match(query, /:vulnerable/, 'includes :vulnerable')
    t.match(query, /:severity\(<=low\)/, 'includes :severity(<=low)')
    t.match(query, /:squat/, 'includes :squat (no comparator, all squat)')
    t.notMatch(query, /:scripts/, 'deliberately excludes :scripts')
  })

  t.test('moderate level audit query', async t => {
    const query = buildAuditQuery('moderate')
    t.match(query, /:malware/, ':malware included')
    t.match(query, /:vuln\(<=medium\)/, 'uses :vuln with <=medium comparator')
    t.match(query, /:severity\(<=medium\)/, ':severity with <=medium')
    t.match(query, /:squat\(<=medium\)/, ':squat with <=medium')
  })

  t.test('high level audit query', async t => {
    const query = buildAuditQuery('high')
    t.match(query, /:malware/, ':malware included')
    t.match(query, /:vuln\(<=high\)/, ':vuln with <=high')
    t.match(query, /:severity\(<=high\)/, ':severity with <=high')
    t.match(query, /:squat\(critical\)/, ':squat with only critical')
  })

  t.test('critical level audit query', async t => {
    const query = buildAuditQuery('critical')
    t.match(query, /:malware/, ':malware included')
    t.match(query, /:vuln\(critical\)/, ':vuln with critical only')
    t.match(query, /:severity\(critical\)/, ':severity with critical only')
    t.match(query, /:squat\(critical\)/, ':squat with critical only')
  })

  t.test('unknown level returns default (low)', async t => {
    const query = buildAuditQuery('unknown')
    const defaultQuery = buildAuditQuery('low')
    t.equal(query, defaultQuery, 'unknown level returns default (low) query')
  })

  t.test('case sensitivity', async t => {
    const query = buildAuditQuery('Low')
    const defaultQuery = buildAuditQuery('low')
    // Should return default since 'Low' !== 'low'
    t.equal(query, defaultQuery, 'level matching is case-sensitive')
  })

  t.test('comparator logic documentation', async t => {
    // Verify the documented comparator behavior:
    // "at or above" a level is expressed as <= (lower = more severe)
    // critical=0, high=1, moderate=2, low=3
    const moderate = buildAuditQuery('moderate')
    const low = buildAuditQuery('low')
    t.not(
      moderate,
      low,
      'moderate and low return different queries'
    )
    t.match(
      moderate,
      /<=medium/,
      'moderate uses <= (includes medium and higher severity)'
    )
  })
})

t.test('type guards - isNodeWithId', async t => {
  t.test('valid nodes with id', async t => {
    t.ok(
      isNodeWithId({ id: 'pkg:foo@1.0.0' }),
      'object with id string'
    )
    t.ok(
      isNodeWithId({ id: 'pkg:bar@2.0.0', name: 'bar', version: '2.0.0' }),
      'object with id and optional properties'
    )
  })

  t.test('invalid: missing id', async t => {
    t.notOk(isNodeWithId({}), 'empty object')
    t.notOk(isNodeWithId({ name: 'foo' }), 'has name but no id')
  })

  t.test('invalid: id wrong type', async t => {
    t.notOk(isNodeWithId({ id: 123 }), 'id is number')
    t.notOk(isNodeWithId({ id: null }), 'id is null')
    t.notOk(isNodeWithId({ id: undefined }), 'id is undefined')
  })

  t.test('invalid: null and non-objects', async t => {
    t.notOk(isNodeWithId(null), 'null input')
    t.notOk(isNodeWithId(undefined), 'undefined input')
    t.notOk(isNodeWithId('string'), 'string input')
    t.notOk(isNodeWithId(123), 'number input')
  })
})

t.test('type guards - isLeveledInsights', async t => {
  t.test('valid leveled insights', async t => {
    t.ok(
      isLeveledInsights({
        low: true,
        medium: false,
        high: true,
        critical: false,
      }),
      'all required boolean properties'
    )
    t.ok(
      isLeveledInsights({
        low: false,
        medium: false,
        high: false,
        critical: true,
      }),
      'all false except critical'
    )
  })

  t.test('invalid: missing keys', async t => {
    t.notOk(
      isLeveledInsights({ low: true, medium: false, high: true }),
      'missing critical'
    )
    t.notOk(
      isLeveledInsights({ low: true, high: true, critical: false }),
      'missing medium'
    )
  })

  t.test('invalid: wrong types', async t => {
    t.notOk(
      isLeveledInsights({
        low: 'true',
        medium: false,
        high: true,
        critical: false,
      }),
      'string instead of boolean'
    )
    t.notOk(
      isLeveledInsights({
        low: 1,
        medium: 0,
        high: 1,
        critical: 0,
      }),
      'numbers instead of booleans'
    )
  })

  t.test('invalid: null and non-objects', async t => {
    t.notOk(isLeveledInsights(null), 'null')
    t.notOk(isLeveledInsights(undefined), 'undefined')
    t.notOk(isLeveledInsights([true, false, true, false]), 'array')
  })
})

t.test('type guards - isSquatInsights', async t => {
  t.test('valid squat insights', async t => {
    t.ok(
      isSquatInsights({ critical: true, medium: false }),
      'valid squat with critical'
    )
    t.ok(
      isSquatInsights({ critical: false, medium: true }),
      'valid squat with medium'
    )
  })

  t.test('invalid: missing keys', async t => {
    t.notOk(isSquatInsights({ critical: true }), 'missing medium')
    t.notOk(isSquatInsights({ medium: false }), 'missing critical')
    t.notOk(isSquatInsights({}), 'empty object')
  })

  t.test('invalid: wrong types', async t => {
    t.notOk(
      isSquatInsights({ critical: 'true', medium: false }),
      'string instead of boolean'
    )
  })

  t.test('invalid: null and non-objects', async t => {
    t.notOk(isSquatInsights(null), 'null')
    t.notOk(isSquatInsights(undefined), 'undefined')
  })
})

t.test('type guards - isNodeWithInsights', async t => {
  t.test('valid node with insights', async t => {
    t.ok(
      isNodeWithInsights({
        id: 'pkg:foo@1.0.0',
        insights: { malware: { low: true, medium: false, high: false, critical: false } },
      }),
      'node with id and insights object'
    )
    t.ok(
      isNodeWithInsights({
        id: 'pkg:foo@1.0.0',
        name: 'foo',
        version: '1.0.0',
        insights: {},
      }),
      'node with optional properties'
    )
  })

  t.test('invalid: missing insights', async t => {
    t.notOk(
      isNodeWithInsights({ id: 'pkg:foo@1.0.0' }),
      'has id but no insights'
    )
  })

  t.test('invalid: insights is null', async t => {
    t.notOk(
      isNodeWithInsights({ id: 'pkg:foo@1.0.0', insights: null }),
      'insights is null'
    )
  })

  t.test('invalid: insights wrong type', async t => {
    t.notOk(
      isNodeWithInsights({ id: 'pkg:foo@1.0.0', insights: 'string' }),
      'insights is string'
    )
    t.notOk(
      isNodeWithInsights({ id: 'pkg:foo@1.0.0', insights: 123 }),
      'insights is number'
    )
  })
})

t.test('type guards - isNodeWithEdgesOut', async t => {
  t.test('valid node with edgesOut Map', async t => {
    const edgesMap = new Map([
      ['key1', { to: { id: 'pkg:dep@1.0.0' } }],
    ])
    t.ok(
      isNodeWithEdgesOut({ edgesOut: edgesMap }),
      'Map with values() method'
    )
  })

  t.test('valid: Map-like object with .values() method', async t => {
    const mapLike = {
      values: () => [{ to: { id: 'pkg:dep@1.0.0' } }],
    }
    t.ok(isNodeWithEdgesOut({ edgesOut: mapLike }), 'Map-like object')
  })

  t.test('invalid: missing edgesOut', async t => {
    t.notOk(isNodeWithEdgesOut({}), 'empty object')
    t.notOk(isNodeWithEdgesOut({ edges: new Map() }), 'wrong property name')
  })

  t.test('invalid: edgesOut missing .values() method', async t => {
    t.notOk(
      isNodeWithEdgesOut({ edgesOut: {} }),
      'plain object without values()'
    )
  })

  t.test('invalid: null and non-objects', async t => {
    t.notOk(isNodeWithEdgesOut(null), 'null')
    t.notOk(isNodeWithEdgesOut({ edgesOut: null }), 'edgesOut is null')
  })
})

t.test('helper constants and types', async t => {
  t.test('severityOrder array', async t => {
    t.strictSame(
      severityOrder,
      ['critical', 'high', 'moderate', 'low'],
      'severity order from most to least severe'
    )
  })

  t.test('emptySummary factory', async t => {
    const summary = emptySummary()
    t.strictSame(
      summary,
      {
        critical: [],
        high: [],
        moderate: [],
        low: [],
      },
      'creates empty summary with all severity buckets'
    )
  })

  t.test('emptyAuditResult factory', async t => {
    const result = emptyAuditResult()
    t.strictSame(
      result,
      {
        summary: {
          critical: [],
          high: [],
          moderate: [],
          low: [],
        },
        total: 0,
        directCount: 0,
        indirectCount: 0,
      },
      'creates empty audit result'
    )
  })
})
