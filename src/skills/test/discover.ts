import { join } from 'node:path'
import t from 'tap'
import {
  discoverHandAuthoredSkills,
  discoverSkills,
} from '../src/discover.ts'

t.test('discoverSkills', async t => {
  t.test('finds skills with a SKILL.md', async t => {
    const dir = t.testdir({
      src: {
        query: {
          skills: {
            'dss-query': {
              'SKILL.md': '# dss-query',
            },
          },
        },
        graph: {},
      },
    })
    t.strictSame(
      discoverSkills(join(dir, 'src')).map(s => s.name),
      ['dss-query'],
    )
  })

  t.test('ignores skill dirs missing SKILL.md', async t => {
    const dir = t.testdir({
      src: {
        query: {
          skills: {
            incomplete: {
              'notes.md': 'no SKILL.md here',
            },
          },
        },
      },
    })
    t.strictSame(discoverSkills(join(dir, 'src')), [])
  })

  t.test(
    'throws on duplicate skill names across workspaces',
    async t => {
      const dir = t.testdir({
        src: {
          a: { skills: { shared: { 'SKILL.md': '# a' } } },
          b: { skills: { shared: { 'SKILL.md': '# b' } } },
        },
      })
      t.throws(
        () => discoverSkills(join(dir, 'src')),
        /duplicate skill name "shared"/,
      )
    },
  )

  t.test(
    'returns empty when the src root does not exist',
    async t => {
      const dir = t.testdir({})
      t.strictSame(discoverSkills(join(dir, 'does-not-exist')), [])
    },
  )
})

t.test('discoverHandAuthoredSkills', async t => {
  t.test(
    'finds skill dirs not already in the generated set',
    async t => {
      const dir = t.testdir({
        out: {
          'hand-authored': {
            'SKILL.md': '# hand-authored',
          },
          generated: {
            'SKILL.md': '# generated',
          },
        },
      })
      const found = discoverHandAuthoredSkills(
        join(dir, 'out'),
        new Set(['generated']),
      )
      t.strictSame(
        found.map(s => s.name),
        ['hand-authored'],
      )
    },
  )

  t.test(
    'returns empty when the output root does not exist',
    async t => {
      const dir = t.testdir({})
      t.strictSame(
        discoverHandAuthoredSkills(
          join(dir, 'does-not-exist'),
          new Set(),
        ),
        [],
      )
    },
  )
})
