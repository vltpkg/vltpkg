import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { parse, escapeScopedNamesSlashes } from '../src/parser.ts'

t.test('escapeScopedNamesSlashes', async t => {
  t.equal(
    escapeScopedNamesSlashes('#@scope/package'),
    '#@scope\\/package',
    'should escape forward slash in #@scope/package pattern',
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
  const ourAst = parse(simpleSelector)

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
    parse(complexSelector),
    'should parse complex selectors with scoped packages',
  )
})
