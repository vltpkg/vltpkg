import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { LinkSkillsResult } from '@vltpkg/graph'
import {
  linkLines,
  skillsJson,
  unmatchedLines,
  unscannedLines,
} from '../src/allow-skills.ts'

t.test('lines', async t => {
  t.strictSame(unmatchedLines(), [])
  t.strictSame(
    unmatchedLines([
      { pattern: 'x*', skills: ['a', 'b'] },
      { pattern: 'y', skills: [] },
      { pattern: 'z' },
    ]),
    [
      '⚠️ No skill matches "x*"; the selected packages ship: a, b',
      '⚠️ No skill matches "y"; the selected packages ship no skills',
      '⚠️ No skill matches "z"; no installed package matches its selector',
    ],
  )
  t.strictSame(unscannedLines({}), [])
  t.strictSame(
    unscannedLines({
      unscanned: ['a (foo@1.0.0)'],
      unscannedReason: 'timeout',
    }),
    [
      '⏳ 1 skill left out, security data timed out: a (foo@1.0.0). Try again later.',
    ],
  )
  t.strictSame(
    unscannedLines({
      unscanned: ['a (foo@1.0.0)', 'b (foo@1.0.0)'],
      unscannedReason: 'unscanned',
    }),
    [
      '⏳ 2 skills left out, Socket has not scanned their packages yet: a (foo@1.0.0), b (foo@1.0.0). Try again later.',
    ],
  )
})

t.test('links', async t => {
  const row = (skill: string, dir = '.agents/skills') => ({
    name: 'foo',
    version: '1.0.0',
    id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    skill,
    path: `/p/node_modules/foo/skills/${skill}`,
    linked: [],
    dir,
    mount: `${dir}/${skill}`,
  })
  const r: LinkSkillsResult = {
    linked: [row('a'), row('a', '.claude/skills')],
    unchanged: [row('b')],
    removed: [],
    conflicts: [],
    dirs: ['.agents/skills', '.claude/skills'],
  }
  t.strictSame(linkLines(), [])
  t.strictSame(linkLines(r), [
    '🔗 Linked 1 agent skill into .agents/skills, .claude/skills',
  ])
  t.strictSame(
    linkLines({
      ...r,
      linked: [],
      removed: ['.agents/skills/c'],
      conflicts: ['.agents/skills/d', '.agents/skills/e'],
      skipped: ['.kiro/skills (not a directory)'],
      gitignore: ['.agents/skills/.gitignore'],
      unmatched: [{ pattern: 'x' }],
      unscanned: ['f (foo@1.0.0)'],
      unscannedReason: 'unscanned',
    }),
    [
      '🧹 Removed 1 stale skill link: .agents/skills/c',
      '⚠️ 2 skill links skipped, path in use or taken by another package: .agents/skills/d, .agents/skills/e',
      '⚠️ No skill matches "x"; no installed package matches its selector',
      '⚠️ Skipped .kiro/skills (not a directory)',
      '⚠️ Could not update .agents/skills/.gitignore',
      '⏳ 1 skill left out, Socket has not scanned their packages yet: f (foo@1.0.0). Try again later.',
    ],
  )
  t.strictSame(skillsJson(r), {
    linked: ['.agents/skills/a', '.claude/skills/a'],
    removed: [],
    conflicts: [],
    dirs: ['.agents/skills', '.claude/skills'],
  })
})
