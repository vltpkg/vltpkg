import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import {
  parse,
  escapeScopedNamesSlashes,
  pseudoClassNames,
} from '../src/index.ts'

t.test('escapeScopedNamesSlashes', async t => {
  t.equal(
    escapeScopedNamesSlashes('#@scope/package'),
    '#@scope\\/package',
    'should escape forward slash in #@scope/package pattern',
  )

  t.equal(
    escapeScopedNamesSlashes('#@scope-dash-sep/package'),
    '#@scope-dash-sep\\/package',
    'should escape forward slash with dashes',
  )

  t.equal(
    escapeScopedNamesSlashes('#@scope.dot.sep/package'),
    '#@scope.dot.sep\\/package',
    'should escape forward slash with dots',
  )

  t.equal(
    escapeScopedNamesSlashes('#@multiple/package #@another/pkg'),
    '#@multiple\\/package #@another\\/pkg',
    'should escape multiple instances of the pattern',
  )

  t.equal(
    escapeScopedNamesSlashes('#@name/package[attr]'),
    '#@name\\/package[attr]',
    'should work with attribute selectors',
  )

  t.equal(
    escapeScopedNamesSlashes('#regular #@123/456'),
    '#regular #@123\\/456',
    'should work with numeric components',
  )

  t.equal(
    escapeScopedNamesSlashes('#regular-selector'),
    '#regular-selector',
    'should not modify strings without the specific pattern',
  )

  t.equal(
    escapeScopedNamesSlashes('a > b #@xyz/abc'),
    'a > b #@xyz\\/abc',
    'should work with combinators',
  )
})

t.test('parse', async t => {
  // Test basic parsing
  t.ok(parse(':root > *'), 'should parse simple selectors')

  // Compare with direct postcss parser for equivalence (minus the escaping)
  const simpleSelector = 'div > span'
  const directAst = postcssSelectorParser().astSync(simpleSelector)
  const ourAst = parse(simpleSelector, { loose: true })

  t.same(
    ourAst.toString(),
    directAst.toString(),
    'should produce equivalent AST to direct postcss parser',
  )

  // Test with a selector that needs escaping
  const selectorWithScoped = '#@scope/package'
  t.doesNotThrow(
    () => parse(selectorWithScoped),
    'should parse selectors with scoped packages without throwing',
  )

  // Test a complex selector
  const complexSelector = 'a > #@scope/pkg.class:pseudo[attr=val]'
  t.ok(
    parse(complexSelector, { loose: true }),
    'should parse complex selectors with scoped packages',
  )

  t.ok(parse(':root > :v(2.0.0)'), 'should parse dots in parameters')
  t.ok(
    parse(':root > :v("2.0.0")'),
    'should parse dots in string parameters',
  )

  const res: any[] = []
  parse(':v(>2)').walk(node => {
    res.push({
      type: node.type,
      source: node.source,
      ...(node.value ? { value: node.value } : undefined),
    })
  })
  t.matchSnapshot(
    res,
    'should clean up usage of combinators params in pseudo selectors that accept only string values',
  )

  res.length = 0
  parse(
    ':root > :v(>1 >2 >3):not(:v(2.0.0-pre+build0.13adsfa1)) > published(<=2024-01-01T11:11:11.111Z) :severity(>=0):score( > 0.9)',
    { loose: true },
  ).walk(node => {
    res.push({
      type: node.type,
      source: node.source,
      ...(node.value ? { value: node.value } : undefined),
    })
  })
  t.matchSnapshot(
    res,
    'should clean up usage of multiple pseudo selectors requiring cleaning up',
  )
})

t.test('valid DSS', async t => {
  for (const q of [
    ':root > *',
    '#a, #b',
    '#a #b',
    ':root ~ #b',
    '> #a',
    ':has(> #a, ~ #b)',
    ':is(#a, :prod)',
    ':not(:dev)',
    '[name^=re i]',
    '[name]',
    '/* c */ :root',
    ':v(>1 >2)',
    ':semver(^1 || ^2)',
    ':attr(scripts, [test])',
    ':score(<0.5, maintenance)',
    ':path("src/**")',
    '#@scope/pkg',
    '* { }',
    '&',
    ':v()',
    '#a\\,',
    // forgiving :is() args
    ':is([name=react], :nonexistent, [name=vue])',
    ':is(:root >)',
    ':is(#a + #b)',
    ':is([name==x])',
    ':is()',
    ':is(:not(:fake))',
    ...pseudoClassNames.map(name => `:${name}`),
  ]) {
    t.doesNotThrow(() => parse(q), q)
  }
})

const invalid: [query: string, message: string, found: string][] = [
  [
    ':fake-pseudo',
    'Unsupported pseudo-class: :fake-pseudo',
    ':fake-pseudo',
  ],
  ['not a selector at all', 'Unsupported selector', 'not'],
  ['> >', 'Dangling combinator', '> >'],
  ['', 'Empty query', ''],
  ['   ', 'Empty query', '   '],
  [
    ':::bogus<<',
    'Unsupported pseudo-class: :::bogus<<',
    ':::bogus<<',
  ],
  [':root >', 'Dangling combinator', ':root >'],
  ['::before', 'Unsupported pseudo-class: ::before', '::before'],
  [':ROOT', 'Unsupported pseudo-class: :ROOT', ':ROOT'],
  [':not(:fake)', 'Unsupported pseudo-class: :fake', ':fake'],
  [':not(:root >)', 'Dangling combinator', ':not(:root >)'],
  [':not()', 'Empty selector', ':not()'],
  [':is(foo)', 'Unsupported selector', 'foo'],
  [':is(:not(foo))', 'Unsupported selector', 'foo'],
  ['#a >>> #b', 'Unsupported combinator: >>>', '>>>'],
  ['#a > /* c */ > #b', 'Dangling combinator', '#a > /* c */ > #b'],
  ['/* c */', 'Empty selector', '/* c */'],
  ['#a,', 'Empty selector', '#a,'],
  ['#a,,#b', 'Empty selector', '#a,,#b'],
  ['#a\\\\,', 'Empty selector', '#a\\\\,'],
  ['#', 'Unsupported selector', '#'],
  ['[]', 'Unsupported selector', '[]'],
  [':root > #', 'Unsupported selector', '#'],
  [':is(#)', 'Unsupported selector', '#'],
  [':has()', 'Empty selector', ':has()'],
  ['.dev', 'Unsupported selector', '.dev'],
  ['"foo"', 'Unsupported selector', '"foo"'],
  ['[name==x]', 'Unsupported attribute operator: ==', '=='],
]

const syntax: [query: string, message: string][] = [
  [':outdated(', 'Invalid query syntax: unexpected end of input'],
  [
    '[name=',
    'Invalid query syntax: Expected a closing square bracket.',
  ],
]

t.test('invalid DSS', async t => {
  for (const [q, message, found] of invalid) {
    t.throws(
      () => parse(q),
      {
        name: 'SyntaxError',
        message,
        cause: { code: 'EQUERY', found },
      },
      JSON.stringify(q),
    )
  }
  for (const [q, message] of syntax) {
    t.throws(
      () => parse(q),
      {
        name: 'SyntaxError',
        message,
        cause: { code: 'EQUERY', found: q },
      },
      q,
    )
  }
  t.throws(() => parse('#a + #b'), {
    message: 'Unsupported combinator: +',
    cause: {
      code: 'EQUERY',
      found: '+',
      validOptions: ['>', '~', ' '],
    },
  })
  t.throws(() => parse('[name='), {
    cause: {
      code: 'EQUERY',
      cause: { message: 'Expected a closing square bracket.' },
    },
  })
})

t.test('loose', async t => {
  for (const [q] of invalid) {
    t.doesNotThrow(() => parse(q, { loose: true }), JSON.stringify(q))
  }
  t.doesNotThrow(() => parse('#a + #b', { loose: true }))
  for (const [q, message] of syntax) {
    t.throws(
      () => parse(q, { loose: true }),
      { message, cause: { code: 'EQUERY' } },
      q,
    )
  }
})
