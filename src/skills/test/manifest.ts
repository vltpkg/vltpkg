import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import { buildManifestEntry, writeIndex } from '../src/manifest.ts'
import { FRONTMATTER } from './fixtures/frontmatter.ts'

t.test('buildManifestEntry', async t => {
  t.test(
    'single-file skill is listed as skill-md pointing at SKILL.md',
    async t => {
      const dir = t.testdir({
        skill: { 'SKILL.md': FRONTMATTER('solo', 'solo skill') },
      })
      const skillDir = join(dir, 'skill')

      const { entry, archive } = await buildManifestEntry(
        { name: 'solo', dir: skillDir },
        ['SKILL.md'],
        'https://example.com',
      )
      t.match(entry, {
        name: 'solo',
        type: 'skill-md',
        description: 'solo skill',
        url: 'https://example.com/.well-known/agent-skills/solo/SKILL.md',
      })
      t.notOk(archive, 'no archive produced for a single-file skill')
    },
  )

  t.test(
    'multi-file skill is bundled as an archive, left for the caller to write',
    async t => {
      const dir = t.testdir({
        skill: {
          'SKILL.md': `${FRONTMATTER('bundled', 'bundled skill')}See [ref](REFERENCE.md).`,
          'REFERENCE.md': '# Reference',
        },
      })
      const skillDir = join(dir, 'skill')

      const { entry, archive } = await buildManifestEntry(
        { name: 'bundled', dir: skillDir },
        ['SKILL.md', 'REFERENCE.md'],
        'https://example.com',
      )
      t.match(entry, {
        name: 'bundled',
        type: 'archive',
        url: 'https://example.com/.well-known/agent-skills/bundled.tar.gz',
      })
      t.ok(Buffer.isBuffer(archive))
    },
  )
})

t.test('writeIndex', async t => {
  t.test(
    'writes a schema + sorted skills array to index.json',
    async t => {
      const dir = t.testdir({ out: {} })
      const outputRoot = join(dir, 'out')

      writeIndex(outputRoot, [
        {
          name: 'zeta',
          type: 'skill-md',
          description: 'z',
          url: 'https://example.com/.well-known/agent-skills/zeta/SKILL.md',
          digest: 'sha256:z',
        },
        {
          name: 'alpha',
          type: 'skill-md',
          description: 'a',
          url: 'https://example.com/.well-known/agent-skills/alpha/SKILL.md',
          digest: 'sha256:a',
        },
      ])

      const manifest = JSON.parse(
        readFileSync(join(outputRoot, 'index.json'), 'utf8'),
      ) as { $schema: string; skills: { name: string }[] }
      t.match(
        manifest.$schema,
        /^https:\/\/schemas\.agentskills\.io\//,
      )
      t.strictSame(
        manifest.skills.map(s => s.name),
        ['alpha', 'zeta'],
        'entries are sorted by name',
      )
    },
  )
})
