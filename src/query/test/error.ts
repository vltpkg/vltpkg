import t from 'tap'
import { parse } from '@vltpkg/dss-parser'
import type { PostcssNode } from '@vltpkg/dss-parser'
import { didYouMean, queryError, selectorText } from '../src/error.ts'

const first = (query: string): PostcssNode => {
  const node = parse(query).nodes[0]?.nodes[0]
  if (!node) throw new Error(`no node parsed for ${query}`)
  return node
}

t.test('selectorText', async t => {
  t.equal(selectorText(first('.dev')), '.dev', 'unescapes')
  t.equal(selectorText(first('[name%=x]')), '[name%=x]', 'attribute')
  t.equal(selectorText(first('"foo"')), '"foo"', 'string')
  t.equal(selectorText(first(':root > *')), ':root', 'pseudo')
  t.equal(
    selectorText({ type: 'combinator', value: '+' } as PostcssNode),
    '+',
    'falls back to the value of an unparsed node',
  )
  t.equal(
    selectorText({ type: 'combinator' } as PostcssNode),
    'combinator',
    'falls back to the type when there is no value',
  )
})

t.test('queryError', async t => {
  const er = queryError('Unsupported selector', first('.dev'), {
    wanted: ':dev',
  })
  t.match(er, {
    message: 'Unsupported selector',
    cause: { code: 'EQUERY', found: '.dev', wanted: ':dev' },
  })
  t.equal(
    typeof (er.cause as { found: unknown }).found,
    'string',
    'never carries the circular parsed node',
  )
})

t.test('didYouMean', async t => {
  const names = ['dev', 'diff', 'dist', 'prod']
  t.strictSame(didYouMean('difff', names), ['diff'])
  t.strictSame(didYouMean('dif', names), ['diff', 'dev', 'dist'])
  t.strictSame(didYouMean('nope', names), [], 'nothing close enough')
  t.strictSame(
    didYouMean('d', names, 0),
    [],
    'a zero budget only matches exactly',
  )
  t.strictSame(didYouMean('dev', names, 0), ['dev'])
  t.strictSame(
    didYouMean('deviation', names),
    [],
    'length gap alone rules a candidate out',
  )
})
