import t from 'tap'
import { parseSkillFrontmatter } from '../src/frontmatter.ts'

t.test('parseSkillFrontmatter', async t => {
  t.test('joins a folded multi-line description', async t => {
    const content = [
      '---',
      'name: dss-query',
      'description:',
      '  Explain and compose vlt Dependency Selector Syntax (DSS)',
      '  queries across multiple lines.',
      'allowed-tools: Read Grep',
      '---',
      '# Body',
    ].join('\n')
    t.strictSame(parseSkillFrontmatter(content, 'dss-query'), {
      name: 'dss-query',
      description:
        'Explain and compose vlt Dependency Selector Syntax (DSS) queries across multiple lines.',
    })
  })

  t.test('throws when there is no frontmatter block', async t => {
    t.throws(
      () => parseSkillFrontmatter('# just a heading', 'demo'),
      /no frontmatter block/,
    )
  })

  t.test('throws when frontmatter is not a map', async t => {
    t.throws(
      () =>
        parseSkillFrontmatter('---\njust plain text\n---\n', 'demo'),
      /frontmatter is not a map/,
    )
  })

  t.test('throws when name is missing', async t => {
    t.throws(
      () =>
        parseSkillFrontmatter(
          '---\ndescription: only a description\n---\n',
          'demo',
        ),
      /missing "name"/,
    )
  })

  t.test('throws when description is missing', async t => {
    t.throws(
      () => parseSkillFrontmatter('---\nname: demo\n---\n', 'demo'),
      /missing "description"/,
    )
  })
})
