import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import { syncAgentSkills } from '../src/sync.ts'

const FRONTMATTER = (
  name: string,
  description = `${name} description`,
) => `---\nname: ${name}\ndescription: ${description}\n---\n`

t.test(
  'writes only the linked file set, with a .generated sentinel',
  async t => {
    const dir = t.testdir({
      src: {
        query: {
          skills: {
            'dss-query': {
              'SKILL.md': `${FRONTMATTER('dss-query')}See [ref](REFERENCE.md).`,
              'REFERENCE.md': '# Reference',
              evals: {
                'grading.md': 'not linked, should not be published',
              },
            },
          },
        },
      },
      out: {},
    })
    const srcRoot = join(dir, 'src')
    const outputRoot = join(dir, 'out')

    const result = await syncAgentSkills(
      srcRoot,
      outputRoot,
      'https://example.com',
    )
    t.strictSame(result, {
      skillCount: 1,
      fileCount: 2,
      archiveCount: 1,
    })

    const skillOut = join(outputRoot, 'dss-query')
    t.ok(existsSync(join(skillOut, 'SKILL.md')))
    t.ok(existsSync(join(skillOut, 'REFERENCE.md')))
    t.ok(existsSync(join(skillOut, '.generated')))
    t.notOk(
      existsSync(join(skillOut, 'evals')),
      'unlinked evals/ folder is not published',
    )
  },
)

t.test(
  'removes stale generated dirs but never hand-authored ones',
  async t => {
    const dir = t.testdir({
      src: {
        query: {
          skills: {
            'dss-query': { 'SKILL.md': FRONTMATTER('dss-query') },
          },
        },
      },
      out: {
        'old-skill': {
          '.generated': '',
          'SKILL.md': 'stale',
        },
        'hand-authored': {
          'SKILL.md': FRONTMATTER('hand-authored'),
        },
      },
    })
    const srcRoot = join(dir, 'src')
    const outputRoot = join(dir, 'out')

    await syncAgentSkills(srcRoot, outputRoot, 'https://example.com')

    t.notOk(
      existsSync(join(outputRoot, 'old-skill')),
      'stale generated dir is removed',
    )
    t.ok(
      existsSync(join(outputRoot, 'hand-authored', 'SKILL.md')),
      'hand-authored dir without a sentinel is left alone',
    )
    t.ok(existsSync(join(outputRoot, 'dss-query', '.generated')))
  },
)

t.test(
  'fully rewrites a skill dir on each run, dropping leftovers',
  async t => {
    const dir = t.testdir({
      src: {
        query: {
          skills: {
            demo: { 'SKILL.md': FRONTMATTER('demo') },
          },
        },
      },
      out: {},
    })
    const srcRoot = join(dir, 'src')
    const outputRoot = join(dir, 'out')

    await syncAgentSkills(srcRoot, outputRoot, 'https://example.com')
    writeFileSync(join(outputRoot, 'demo', 'stale.md'), 'leftover')
    t.ok(existsSync(join(outputRoot, 'demo', 'stale.md')))

    await syncAgentSkills(srcRoot, outputRoot, 'https://example.com')
    t.notOk(
      existsSync(join(outputRoot, 'demo', 'stale.md')),
      'leftover file from a previous run is removed',
    )
  },
)

t.test('discovery manifest (index.json)', async t => {
  t.test(
    'single-file skill is listed as skill-md with a digest of SKILL.md',
    async t => {
      const dir = t.testdir({
        src: {
          query: {
            skills: {
              solo: { 'SKILL.md': FRONTMATTER('solo', 'solo skill') },
            },
          },
        },
        out: {},
      })
      const srcRoot = join(dir, 'src')
      const outputRoot = join(dir, 'out')

      await syncAgentSkills(
        srcRoot,
        outputRoot,
        'https://example.com',
      )

      const manifest = JSON.parse(
        readFileSync(join(outputRoot, 'index.json'), 'utf8'),
      ) as { $schema: string; skills: unknown[] }
      t.match(
        manifest.$schema,
        /^https:\/\/schemas\.agentskills\.io\//,
      )
      t.strictSame(manifest.skills, [
        {
          name: 'solo',
          type: 'skill-md',
          description: 'solo skill',
          url: 'https://example.com/.well-known/agent-skills/solo/SKILL.md',
          digest: `sha256:${createHash('sha256')
            .update(
              readFileSync(join(outputRoot, 'solo', 'SKILL.md')),
            )
            .digest('hex')}`,
        },
      ])
    },
  )

  t.test(
    'multi-file skill is bundled as a verifiable archive',
    async t => {
      const dir = t.testdir({
        src: {
          query: {
            skills: {
              bundled: {
                'SKILL.md': `${FRONTMATTER('bundled', 'bundled skill')}See [ref](REFERENCE.md).`,
                'REFERENCE.md': '# Reference',
              },
            },
          },
        },
        out: {},
      })
      const srcRoot = join(dir, 'src')
      const outputRoot = join(dir, 'out')

      await syncAgentSkills(
        srcRoot,
        outputRoot,
        'https://example.com',
      )

      const archivePath = join(outputRoot, 'bundled.tar.gz')
      t.ok(existsSync(archivePath), 'archive file was written')

      const manifest = JSON.parse(
        readFileSync(join(outputRoot, 'index.json'), 'utf8'),
      ) as {
        skills: { name: string; type: string; digest: string }[]
      }
      const entry = manifest.skills.find(s => s.name === 'bundled')
      t.match(entry, {
        name: 'bundled',
        type: 'archive',
        url: 'https://example.com/.well-known/agent-skills/bundled.tar.gz',
      })
      t.equal(
        entry?.digest,
        `sha256:${createHash('sha256')
          .update(readFileSync(archivePath))
          .digest('hex')}`,
        'digest matches the actual archive bytes',
      )
    },
  )

  t.test(
    'includes hand-authored skills without modifying them',
    async t => {
      const dir = t.testdir({
        src: { query: { skills: {} } },
        out: {
          'hand-authored': {
            'SKILL.md': FRONTMATTER('hand-authored', 'hand authored'),
          },
        },
      })
      const srcRoot = join(dir, 'src')
      const outputRoot = join(dir, 'out')
      const before = readFileSync(
        join(outputRoot, 'hand-authored', 'SKILL.md'),
        'utf8',
      )

      await syncAgentSkills(
        srcRoot,
        outputRoot,
        'https://example.com',
      )

      t.equal(
        readFileSync(
          join(outputRoot, 'hand-authored', 'SKILL.md'),
          'utf8',
        ),
        before,
        'hand-authored SKILL.md is untouched',
      )
      const manifest = JSON.parse(
        readFileSync(join(outputRoot, 'index.json'), 'utf8'),
      ) as { skills: { name: string }[] }
      t.ok(
        manifest.skills.some(s => s.name === 'hand-authored'),
        'hand-authored skill appears in the manifest',
      )
    },
  )

  t.test(
    'regenerates cleanly: removed skills drop their entry and archive',
    async t => {
      const dir = t.testdir({
        src: {
          query: {
            skills: {
              bundled: {
                'SKILL.md': `${FRONTMATTER('bundled')}See [ref](REFERENCE.md).`,
                'REFERENCE.md': '# Reference',
              },
            },
          },
        },
        out: {},
      })
      const srcRoot = join(dir, 'src')
      const outputRoot = join(dir, 'out')

      await syncAgentSkills(
        srcRoot,
        outputRoot,
        'https://example.com',
      )
      t.ok(existsSync(join(outputRoot, 'bundled.tar.gz')))

      writeFileSync(
        join(srcRoot, 'query', 'skills', 'bundled', 'SKILL.md'),
        FRONTMATTER('bundled'),
      )
      await syncAgentSkills(
        srcRoot,
        outputRoot,
        'https://example.com',
      )

      t.notOk(
        existsSync(join(outputRoot, 'bundled.tar.gz')),
        'stale archive from when bundled had 2 files is removed',
      )
      const manifest = JSON.parse(
        readFileSync(join(outputRoot, 'index.json'), 'utf8'),
      ) as { skills: { name: string; type: string }[] }
      t.strictSame(manifest.skills, [
        {
          name: 'bundled',
          type: 'skill-md',
          description: 'bundled description',
          url: 'https://example.com/.well-known/agent-skills/bundled/SKILL.md',
          digest: `sha256:${createHash('sha256')
            .update(
              readFileSync(join(outputRoot, 'bundled', 'SKILL.md')),
            )
            .digest('hex')}`,
        },
      ])
    },
  )
})
