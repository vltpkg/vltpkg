import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import type { Skill } from '../../src/skills/discover.ts'
import { globRegExp, maskSkills } from '../../src/skills/mask.ts'

t.test('globRegExp', async t => {
  const yes: [string, string][] = [
    ['find-skills', 'find-skills'],
    ['find-skills', 'FIND-Skills'],
    ['vercel*', 'vercel-react'],
    ['vercel*', 'vercel'],
    ['*-review', 'code-review'],
    ['a*b*c', 'a-b-c'],
    ['a*b*c', 'abc'],
    ['*', 'anything'],
    ['**', 'x'],
    ['a.b', 'a.b'],
    ['a+b', 'a+b'],
    ['(x)', '(x)'],
    ['my skill', 'My Skill'],
    ['*x*', 'x'],
  ]
  const no: [string, string][] = [
    ['find', 'find-skills'],
    ['skills', 'find-skills'],
    ['vercel*', 'my-vercel'],
    ['*-review', 'review-x'],
    ['a.b', 'axb'],
    ['a+b', 'aab'],
    ['(x)', 'x'],
  ]
  for (const [p, s] of yes) t.ok(globRegExp(p).test(s), `${p} ~ ${s}`)
  for (const [p, s] of no)
    t.notOk(globRegExp(p).test(s), `${p} !~ ${s}`)
})

t.test('maskSkills', async t => {
  const sk = (id: string, skill: string, frontmatterName?: string) =>
    ({
      name: id,
      id: joinDepIDTuple(['registry', '', `${id}@1.0.0`]),
      skill,
      ...(frontmatterName && { frontmatterName }),
      path: `/x/${id}/${skill}`,
      linked: [],
    }) satisfies Skill
  const a = sk('foo', 'a')
  const b = sk('foo', 'b-review')
  const c = sk('foo', 'c', 'My Skill')
  const d = sk('bar', 'a')
  const e = sk('baz', 'e')
  const skills = [a, d, b, c, e]
  const ids = (...s: Skill[]) => new Set(s.map(s => s.id))

  t.strictSame(
    maskSkills(skills, [{ ids: ids(a) }]),
    { skills: [a, b, c], unmatched: [] },
    'plain part: every skill of its packages',
  )
  t.strictSame(
    maskSkills(skills, [{ ids: ids(a), patterns: ['A', '*-review'] }])
      .skills,
    [a, b],
    'patterns: matching only, any case, globs',
  )
  t.strictSame(
    maskSkills(skills, [{ ids: ids(a), patterns: ['my skill'] }]),
    { skills: [c], unmatched: [] },
    'frontmatter name',
  )
  t.strictSame(
    maskSkills(skills, [{ ids: ids(a), patterns: ['my*'] }]).skills,
    [c],
    'frontmatter name glob',
  )
  t.strictSame(
    maskSkills(skills, [
      { ids: ids(a) },
      { ids: ids(a), patterns: ['a'] },
    ]).skills,
    [a, b, c],
    'union: plain and pattern parts on one package',
  )
  t.strictSame(
    maskSkills(skills, [
      { ids: ids(a), patterns: ['a'] },
      { ids: ids(a, d), patterns: ['c'] },
    ]).skills,
    [a, c],
    'union: two pattern parts',
  )
  t.strictSame(
    maskSkills(skills, [{ ids: ids(d), patterns: ['a'] }]).skills,
    [d],
    'same name, other package: dropped',
  )
  t.strictSame(
    maskSkills(skills, [{ ids: ids(a, d, e) }, { ids: ids(e) }])
      .skills,
    skills,
    'order kept',
  )
  t.strictSame(maskSkills(skills, []), { skills: [], unmatched: [] })
  t.strictSame(
    maskSkills(skills, [
      {
        ids: new Set([joinDepIDTuple(['registry', '', 'foo@2.0.0'])]),
        patterns: ['a'],
      },
    ]),
    { skills: [a], unmatched: [] },
    'part on another version: applies to the picked one',
  )

  t.strictSame(
    maskSkills(skills, [
      { ids: ids(a) },
      { ids: ids(a, d), patterns: ['nope', 'a', 'x*'] },
      { ids: new Set(), patterns: ['y'] },
      { ids: ids(e), patterns: ['nope'] },
    ]),
    {
      skills: [a, d, b, c],
      unmatched: [
        { pattern: 'nope', skills: ['a', 'b-review', 'c'] },
        { pattern: 'x*', skills: ['a', 'b-review', 'c'] },
        { pattern: 'y', skills: [] },
        { pattern: 'nope', skills: ['e'] },
      ],
    },
    'unmatched: per part and pattern, skills sorted unique',
  )
})
