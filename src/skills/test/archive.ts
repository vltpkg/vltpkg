import { createHash } from 'node:crypto'
import { join } from 'node:path'
import t from 'tap'
import { buildArchive, computeDigest } from '../src/archive.ts'

t.test('computeDigest', async t => {
  t.test('returns a sha256: prefixed hex digest of the bytes', t => {
    const bytes = Buffer.from('hello world', 'utf8')
    t.equal(
      computeDigest(bytes),
      `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    )
    t.end()
  })

  t.test('differs for different input bytes', t => {
    t.not(
      computeDigest(Buffer.from('a')),
      computeDigest(Buffer.from('b')),
    )
    t.end()
  })
})

t.test('buildArchive', async t => {
  t.test(
    'produces a gzip archive containing exactly the given files',
    async t => {
      const dir = t.testdir({
        'SKILL.md': '# demo',
        'REFERENCE.md': '# reference',
        'extra.md': '# not included',
      })
      const bytes = await buildArchive({ name: 'demo', dir }, [
        'SKILL.md',
        'REFERENCE.md',
      ])
      t.ok(Buffer.isBuffer(bytes))
      // gzip magic bytes
      t.equal(bytes[0], 0x1f)
      t.equal(bytes[1], 0x8b)

      const { list } = await import('tar')
      const entries: string[] = []
      list({
        onReadEntry: entry => entries.push(entry.path),
      }).end(bytes)
      t.strictSame(
        new Set(entries),
        new Set(['SKILL.md', 'REFERENCE.md']),
      )
    },
  )

  t.test('supports nested relative paths', async t => {
    const dir = t.testdir({
      'SKILL.md': '# demo',
      docs: {
        'nested.md': '# nested',
      },
    })
    const bytes = await buildArchive({ name: 'demo', dir }, [
      'SKILL.md',
      join('docs', 'nested.md'),
    ])
    const { list } = await import('tar')
    const entries: string[] = []
    list({
      onReadEntry: entry => entries.push(entry.path),
    }).end(bytes)
    t.ok(entries.includes('SKILL.md'))
    t.ok(
      entries.some(e => e.replace(/\\/g, '/') === 'docs/nested.md'),
    )
  })
})
