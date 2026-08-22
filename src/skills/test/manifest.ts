import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import { buildManifestEntry, writeIndex } from '../src/manifest.ts'

const FRONTMATTER = (
  name: string,
  description = `${name} description`,
) => `---\nname: ${name}\ndescription: ${description}\n---\n`

t.test('buildManifestEntry', async t => {
  t.test(
    'single-file skill is listed as skill-md pointing at SKILL.md',
    async t => {
      const dir = t.testdir({
        skill: { 'SKILL.md': FRONTMATTER('solo', 'solo skill') },
        out: {},
      })
      const skillDir = join(dir, 'skill')
      const outputRoot = join(dir, 'out')

      const entry = await buildManifestEntry(
        { name: 'solo', dir: skillDir },
        ['SKILL.md'],
        outputRoot,
        'https://example.com',
      )
      t.match(entry, {
        name: 'solo',
        type: 'skill-md',
        description: 'solo skill',
        url: 'https://example.com/.well-known/agent-skills/solo/SKILL.md',
      })
      t.notOk(existsSync(join(outputRoot, 'solo.tar.gz')))
    },
  )

  t.test(
    'multi-file skill is bundled as an archive and written to outputRoot',
    async t => {
      const dir = t.testdir({
        skill: {
          'SKILL.md': `${FRONTMATTER('bundled', 'bundled skill')}See [ref](REFERENCE.md).`,
          'REFERENCE.md': '# Reference',
        },
        out: {},
      })
      const skillDir = join(dir, 'skill')
      const outputRoot = join(dir, 'out')

      const entry = await buildManifestEntry(
        { name: 'bundled', dir: skillDir },
        ['SKILL.md', 'REFERENCE.md'],
        outputRoot,
        'https://example.com',
      )
      t.match(entry, {
        name: 'bundled',
        type: 'archive',
        url: 'https://example.com/.well-known/agent-skills/bundled.tar.gz',
      })
      t.ok(existsSync(join(outputRoot, 'bundled.tar.gz')))
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
