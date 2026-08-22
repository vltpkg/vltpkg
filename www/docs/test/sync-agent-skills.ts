import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import {
  discoverSkills,
  parseSkillFrontmatter,
  resolveSkillFiles,
  syncAgentSkills,
} from '../scripts/sync-agent-skills.mts'

const FRONTMATTER = (
  name: string,
  description = `${name} description`,
) => `---\nname: ${name}\ndescription: ${description}\n---\n`

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

t.test('resolveSkillFiles', async t => {
  t.test(
    'follows relative links and recurses into linked markdown',
    async t => {
      const dir = t.testdir({
        'SKILL.md': [
          '# Skill',
          'See [reference](REFERENCE.md) and [nested](docs/nested.md).',
          'Skip [anchor only](#section) and [external](https://example.com/x.md).',
        ].join('\n'),
        'REFERENCE.md': '# Reference',
        docs: {
          'nested.md': 'See [asset](../assets/logo.png).',
        },
        assets: {
          'logo.png': 'binary-ish',
        },
      })
      const files = resolveSkillFiles({ name: 'test-skill', dir })
      t.strictSame(
        new Set(files),
        new Set([
          'SKILL.md',
          'REFERENCE.md',
          join('docs', 'nested.md'),
          join('assets', 'logo.png'),
        ]),
      )
    },
  )

  t.test(
    'does not follow links inside non-markdown files',
    async t => {
      const dir = t.testdir({
        'SKILL.md': 'See [asset](asset.txt).',
        'asset.txt':
          'plain text with a fake link: [fake](../../etc/passwd)',
      })
      const files = resolveSkillFiles({ name: 'test-skill', dir })
      t.strictSame(new Set(files), new Set(['SKILL.md', 'asset.txt']))
    },
  )

  t.test('throws when a linked file does not exist', async t => {
    const dir = t.testdir({
      'SKILL.md': 'See [missing](missing.md).',
    })
    t.throws(
      () => resolveSkillFiles({ name: 'test-skill', dir }),
      /linked file not found: missing\.md/,
    )
  })

  t.test(
    'throws when a link escapes the skill directory',
    async t => {
      const dir = t.testdir({
        inner: {
          'SKILL.md': 'See [escape](../outside.md).',
        },
        'outside.md': '# outside',
      })
      t.throws(
        () =>
          resolveSkillFiles({
            name: 'test-skill',
            dir: join(dir, 'inner'),
          }),
        /escapes the skill directory/,
      )
    },
  )
})

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

t.test('syncAgentSkills', async t => {
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

      const result = await syncAgentSkills(srcRoot, outputRoot)
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

      await syncAgentSkills(srcRoot, outputRoot)

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

      await syncAgentSkills(srcRoot, outputRoot)
      writeFileSync(join(outputRoot, 'demo', 'stale.md'), 'leftover')
      t.ok(existsSync(join(outputRoot, 'demo', 'stale.md')))

      await syncAgentSkills(srcRoot, outputRoot)
      t.notOk(
        existsSync(join(outputRoot, 'demo', 'stale.md')),
        'leftover file from a previous run is removed',
      )
    },
  )
})

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

      await syncAgentSkills(srcRoot, outputRoot)

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

      await syncAgentSkills(srcRoot, outputRoot)
      t.ok(existsSync(join(outputRoot, 'bundled.tar.gz')))

      writeFileSync(
        join(srcRoot, 'query', 'skills', 'bundled', 'SKILL.md'),
        FRONTMATTER('bundled'),
      )
      await syncAgentSkills(srcRoot, outputRoot)

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
          url: 'https://docs.vlt.io/.well-known/agent-skills/bundled/SKILL.md',
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
