import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  symlinkSync,
  utimesSync,
} from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { list } from 'tar'
import type { ReadEntry } from 'tar'
import {
  indexPath,
  listFiles,
  publishSkills,
  readDescription,
} from '../../src/lib/publish-skills.ts'

const skillMd = (name: string, description: string) =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`

const sha256 = (file: string) =>
  'sha256:' +
  createHash('sha256').update(readFileSync(file)).digest('hex')

// the entries of a .tar.gz, in archive order
const entries = (file: string) => {
  const found: ReadEntry[] = []
  list({ file, sync: true, onReadEntry: e => found.push(e) })
  return found
}

const fixture = (t: Test) =>
  t.testdir({
    skills: {
      'one-file': { 'SKILL.md': skillMd('one-file', 'Just a file.') },
      'many-files': {
        'SKILL.md': skillMd('many-files', 'Has references.'),
        'REFERENCE.md': '# Reference\n',
        scripts: { 'run.sh': 'echo hi\n' },
        evals: { 'grade.mjs': 'not published\n' },
      },
      'no-skill': { 'README.md': 'not a skill\n' },
      'README.md': 'not a skill either\n',
    },
    public: {
      skills: { stale: { 'SKILL.md': 'left from an earlier run\n' } },
    },
  })

t.test('publishes skills, archives and the index', t => {
  const dir = fixture(t)
  const publicDir = join(dir, 'public')
  const index = publishSkills(join(dir, 'skills'), publicDir)

  t.same(index, {
    $schema:
      'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      {
        name: 'many-files',
        type: 'archive',
        description: 'Has references.',
        url: '/skills/many-files.tar.gz',
        digest: sha256(join(publicDir, 'skills/many-files.tar.gz')),
      },
      {
        name: 'one-file',
        type: 'skill-md',
        description: 'Just a file.',
        url: '/skills/one-file/SKILL.md',
        digest: sha256(join(publicDir, 'skills/one-file/SKILL.md')),
      },
    ],
  })
  t.same(
    JSON.parse(readFileSync(join(publicDir, indexPath), 'utf8')),
    index,
    'writes the index to the well-known path',
  )

  t.ok(existsSync(join(publicDir, 'skills/many-files/REFERENCE.md')))
  t.notOk(existsSync(join(publicDir, 'skills/many-files/evals')))
  t.notOk(existsSync(join(publicDir, 'skills/no-skill')))
  t.notOk(existsSync(join(publicDir, 'skills/stale')))
  t.notOk(existsSync(join(publicDir, 'skills/one-file.tar.gz')))

  const archived = entries(
    join(publicDir, 'skills/many-files.tar.gz'),
  )
  t.same(
    archived.map(e => e.path),
    ['REFERENCE.md', 'SKILL.md', 'scripts/run.sh'],
    'files sorted at the archive root, without evals',
  )
  for (const e of archived) {
    t.equal(e.type, 'File', e.path)
    t.equal(e.mtime?.getTime(), 0, e.path)
    t.notOk(e.uid, e.path)
    t.notOk(e.uname, e.path)
  }
  t.end()
})

t.test('archives are the same bytes for the same files', t => {
  const dir = fixture(t)
  const publicDir = join(dir, 'public')
  const archive = join(publicDir, 'skills/many-files.tar.gz')
  publishSkills(join(dir, 'skills'), publicDir)
  const first = readFileSync(archive)

  const later = new Date('2030-01-01')
  utimesSync(join(dir, 'skills/many-files/SKILL.md'), later, later)
  publishSkills(join(dir, 'skills'), publicDir)
  t.same(readFileSync(archive), first)
  t.end()
})

t.test('a skill holding a link is an error', t => {
  const dir = fixture(t)
  // a junction on Windows, which needs no privileges there
  symlinkSync(
    join(dir, 'skills/one-file'),
    join(dir, 'skills/many-files/linked'),
    'junction',
  )
  t.throws(() => listFiles(join(dir, 'skills/many-files')), {
    message: /linked: skills may only hold files and folders$/,
  })
  t.end()
})

t.test('a SKILL.md needs a description', t => {
  const dir = t.testdir({
    'SKILL.md': '---\nname: x\n---\n',
    'empty.md': '---\nname: x\ndescription: ""\n---\n',
  })
  t.throws(() => readDescription(join(dir, 'SKILL.md')), {
    message: /SKILL\.md: frontmatter needs a description$/,
  })
  t.throws(() => readDescription(join(dir, 'empty.md')))
  t.end()
})
