import t from 'tap'
import type {
  LinkSkillsOptions,
  SkillsOptions,
} from '../../src/skills/index.ts'

t.test('loads the skills code on first use', async t => {
  const reads = { listSkills: 0, linkSkills: 0 }
  const calls: unknown[] = []
  const list = { skills: [], dirs: [] }
  const link = { linked: [] }
  const { listSkills, linkSkills } = await t.mockImport<
    typeof import('../../src/skills/lazy.ts')
  >('../../src/skills/lazy.ts', {
    '../../src/skills/index.ts': {
      get listSkills() {
        reads.listSkills++
        return async (o: unknown) => (calls.push(['list', o]), list)
      },
      get linkSkills() {
        reads.linkSkills++
        return async (o: unknown) => (calls.push(['link', o]), link)
      },
    },
  })
  t.strictSame(reads, { listSkills: 0, linkSkills: 0 }, 'not loaded')
  const lo = { target: '#a' } as SkillsOptions
  const ko = { target: '#b' } as LinkSkillsOptions
  t.equal(await listSkills(lo), list)
  t.equal(await linkSkills(ko), link)
  t.equal(await listSkills(lo), list)
  t.equal(await linkSkills(ko), link)
  t.strictSame(calls, [
    ['list', lo],
    ['link', ko],
    ['list', lo],
    ['link', ko],
  ])
  t.strictSame(reads, { listSkills: 1, linkSkills: 1 }, 'loaded once')
})
