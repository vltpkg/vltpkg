import t from 'tap'
import {
  asSemverFunctionName,
  isSemverFunctionName,
  parseInternals,
  semverParser,
} from '../../src/pseudo/semver.ts'
import { asPostcssNodeWithChildren } from '../../src/types.ts'
import type { ParserState } from '../../src/types.ts'
import {
  getSemverRichGraph,
  getSimpleGraph,
} from '../fixtures/graph.ts'
import { parse } from '../../src/parser.ts'

t.test('select from semver definition', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = parse(query)
    const current = asPostcssNodeWithChildren(ast.first.first)
    const state: ParserState = {
      current,
      initial: {
        edges: new Set(graph.edges.values()),
        nodes: new Set(graph.nodes.values()),
      },
      partial: {
        edges: new Set(graph.edges.values()),
        nodes: new Set(graph.nodes.values()),
      },
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      retries: 0,
      cancellable: async () => {},
      walk: async i => i,
      securityArchive: undefined,
      specOptions: {},
    }
    return state
  }

  await t.test('quoted no spaces', async t => {
    const res = await semverParser(getState(':semver(">=2")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['b'],
      'should have expected result using quoted semver notation (no spaces)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted no spaces', async t => {
    const res = await semverParser(getState(':semver(>=2)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['b'],
      'should have expected result using unquoted semver notation (no spaces)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted with spaces', async t => {
    const res = await semverParser(getState(':semver(">= 2")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['b'],
      'should have expected result using quoted semver notation (with spaces)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted with spaces', async t => {
    const res = await semverParser(getState(':semver(>= 2)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['b'],
      'should have expected result using unquoted semver notation (with spaces)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted with multiple spaces', async t => {
    const res = await semverParser(
      getState(':semver("1 || 2 || 3 >= 4 < 5")'),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
      'should have expected result using quoted semver notation (with multiple spaces)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted with multiple spaces', async t => {
    const res = await semverParser(
      getState(':semver(1 || 2 || 3 >= 4 < 5)'),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
      'should have expected result using unquoted semver notation (with multiple spaces)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted lte semver', async t => {
    const res = await semverParser(
      getState(':semver("<=1")', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['semver-rich-project@1.0.0', 'a@1.0.1'],
      'should have expected result using quoted lte semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted lte semver', async t => {
    const res = await semverParser(
      getState(':semver(<=1)', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['semver-rich-project@1.0.0', 'a@1.0.1'],
      'should have expected result using unquoted lte semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted hyphen-separated semver', async t => {
    const res = await semverParser(
      getState(':semver("100 - 200")', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['e@120.0.0'],
      'should have expected result using quoted hyphen-separated semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted hyphen-separated semver', async t => {
    const res = await semverParser(
      getState(':semver(100 - 200)', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['e@120.0.0'],
      'should have expected result using unquoted hyphen-separated semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted pre-release semver', async t => {
    const res = await semverParser(
      getState(':semver("1.3.4-beta.1")', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['e@1.3.4-beta.1'],
      'should have expected result using quoted pre-release semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted pre-release semver', async t => {
    const res = await semverParser(
      getState(':semver(1.3.4-beta.1)', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['e@1.3.4-beta.1'],
      'should have expected result using unquoted pre-release semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted extended prerelease semver', async t => {
    const res = await semverParser(
      getState(':semver("1.2.3-rc.1+rev.2")', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['g@1.2.3-rc.1+rev.2'],
      'should have expected result using quoted extended prerelease semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted extended prerelease semver', async t => {
    const res = await semverParser(
      getState(':semver(1.2.3-rc.1+rev.2)', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['g@1.2.3-rc.1+rev.2'],
      'should have expected result using unquoted extended prerelease semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted pipe-separated semver', async t => {
    const res = await semverParser(
      getState(':semver("3 || 4")', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['c@3.4.0', 'f@4.5.6'],
      'should have expected result using quoted pipe-separated semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted pipe-separated semver', async t => {
    const res = await semverParser(
      getState(':semver(3 || 4)', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['c@3.4.0', 'f@4.5.6'],
      'should have expected result using unquoted pipe-separated semver',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('quoted custom semver function', async t => {
    const res = await semverParser(
      getState(':semver("2.3.4", "neq")', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      [
        'semver-rich-project@1.0.0',
        'a@1.0.1',
        'b@2.2.1',
        'c@3.4.0',
        'e@120.0.0',
        'f@4.5.6',
        'g@1.2.3-rc.1+rev.2',
        'e@1.3.4-beta.1',
      ],
      'should have expected result using quoted custom semver function',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('unquoted custom semver function', async t => {
    const res = await semverParser(
      getState(':semver(2.3.4, neq)', getSemverRichGraph()),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      [
        'semver-rich-project@1.0.0',
        'a@1.0.1',
        'b@2.2.1',
        'c@3.4.0',
        'e@120.0.0',
        'f@4.5.6',
        'g@1.2.3-rc.1+rev.2',
        'e@1.3.4-beta.1',
      ],
      'should have expected result using unquoted custom semver function',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('invalid pseudo selector usage', async t => {
    await t.rejects(
      () => semverParser(getState(':semver')),
      /Failed to parse :semver selector/,
      'should throw an error for invalid pseudo selector usage',
    )
  })

  await t.test(':attr comparison value', async t => {
    const res = await semverParser(
      getState(
        ':semver(10.0.0, satisfies, :attr(engines, [node]))',
        getSemverRichGraph(),
      ),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
      ['b@2.2.1'],
      'should have expected result using custom :attr comparison value',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    ':attr comparison value forcing multiple ranges comparison',
    async t => {
      const res = await semverParser(
        getState(
          ':semver(>=10, satisfies, :attr(engines, [node]))',
          getSemverRichGraph(),
        ),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
        [],
        'should not match any nodes when comparing ranges',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    ':attr matching arbitrary manifest property',
    async t => {
      const res = await semverParser(
        getState(
          ':semver(^2, satisfies, :attr([arbitrarySemverValue]))',
          getSemverRichGraph(),
        ),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
        ['f@4.5.6'],
        'should match arbitrary values using :attr pseudo selector',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'string matching arbitrary manifest property',
    async t => {
      const res = await semverParser(
        getState(
          ':semver(^2, satisfies, "arbitrarySemverValue")',
          getSemverRichGraph(),
        ),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
        ['f@4.5.6'],
        'should match arbitrary values using string name',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'attribute matching arbitrary manifest property',
    async t => {
      const res = await semverParser(
        getState(
          ':semver(^2, satisfies, [arbitrarySemverValue])',
          getSemverRichGraph(),
        ),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
        ['f@4.5.6'],
        'should match arbitrary values using attribute name',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'diff semver function matching arbitrary manifest property',
    async t => {
      const res = await semverParser(
        getState(
          ':semver(2.0.0, eq, "arbitrarySemverValue")',
          getSemverRichGraph(),
        ),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => `${n.name}@${n.version}`),
        ['f@4.5.6'],
        'should match arbitrary values using a diff semver function',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'trying to use exact version comparison with a range value',
    async t => {
      await t.rejects(
        semverParser(
          getState(
            ':semver(^2, eq, [arbitrarySemverValue])',
            getSemverRichGraph(),
          ),
        ),
        /invalid version/,
        'should throw an invalid version error',
      )
    },
  )

  await t.test(
    'attribute matching arbitrary manifest property',
    async t => {
      await t.rejects(
        semverParser(
          getState(
            ':semver(^2, satisfies, :unsupported)',
            getSemverRichGraph(),
          ),
        ),
        /Failed to parse :semver selector/,
        'should throw an error for invalid custom attribute selector',
      )
    },
  )
})

t.test('isSemverFunctionName', async t => {
  t.ok(
    isSemverFunctionName('satisfies'),
    'should return true for valid semver function name',
  )
  t.notOk(
    isSemverFunctionName('unsupported'),
    'should return false for valid semver function name',
  )
})

t.test('asSemverFunctionName', async t => {
  t.throws(
    () => asSemverFunctionName('unsupported'),
    /Invalid semver function name/,
    'should throw an error for invalid semver function name',
  )
  t.ok(
    asSemverFunctionName('eq'),
    'should return valid semver function name',
  )
})

t.test('parse an element other than semver', async t => {
  const ast = parse(':root')
  const notSemver = asPostcssNodeWithChildren(ast.first.first).nodes
  t.throws(
    () => parseInternals(notSemver, false),
    /Expected a query node/,
    'should bubble up original thrown error',
  )
})

t.test('parse an invalid semver function name', async t => {
  const ast = parse(':semver(^1.0.0, ":unsupported")')
  const notSemver = asPostcssNodeWithChildren(ast.first.first).nodes
  t.throws(
    () => parseInternals(notSemver, false),
    /Invalid semver function name/,
    'should throw an error for invalid semver function name',
  )
})
