import t from 'tap'
import { formatOptionsChange } from '../../src/lockfile/format-options-change.ts'

t.test('renders one line per change', async t => {
  t.equal(
    formatOptionsChange({
      section: 'catalog',
      key: 'oxlint',
      from: '^1.59.0',
      to: '^1.81.0',
    }),
    'catalog: oxlint "^1.59.0" -> "^1.81.0"',
  )
  t.equal(
    formatOptionsChange({
      section: 'catalog',
      key: 'abbrev',
      to: '^3.0.0',
    }),
    'catalog: abbrev (missing) -> "^3.0.0"',
  )
  t.equal(
    formatOptionsChange({
      section: 'modifiers',
      key: ':root > #abbrev',
      from: '2.0.0',
    }),
    'modifiers: :root > #abbrev "2.0.0" -> (removed)',
  )
  t.equal(
    formatOptionsChange({
      section: 'registry',
      from: 'https://a/',
      to: 'https://b/',
    }),
    'registry: "https://a/" -> "https://b/"',
    'a scalar section has no key',
  )
})

t.test('url userinfo is redacted', async t => {
  const value = (v: string) =>
    formatOptionsChange({ section: 's', to: v }).replace(
      's: (missing) -> ',
      '',
    )
  t.equal(
    value('https://user:tok@registry.npmjs.org/'),
    '"https://***@registry.npmjs.org/"',
  )
  t.equal(
    value('git+https://user:tok@github.com/a/b'),
    '"git+https://***@github.com/a/b"',
  )
  t.equal(
    value('https://registry.npmjs.org/'),
    '"https://registry.npmjs.org/"',
    'no userinfo, untouched',
  )
  t.equal(
    value('github:foo/bar'),
    '"github:foo/bar"',
    'parses, but no userinfo',
  )
  t.equal(value('^1.0.0'), '"^1.0.0"', 'not a url')
})
