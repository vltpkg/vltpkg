import { spawnSync } from 'node:child_process'
import t from 'tap'
import { join, relative } from 'node:path'
import { readdirSync } from 'node:fs'
import { __CODE_SPLIT_SCRIPT_NAME } from '../src/remove.ts'

const env = {
  ...process.env,
  NODE_OPTIONS: '--no-warnings --experimental-strip-types',
}

const readDirs = (dir: string) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(d => d.isFile())
    .map(d => relative(dir, join(d.parentPath, d.name)))
    .sort()
    .map(d => d.replaceAll('\\', '/'))

t.test('run the remover', async t => {
  const dir = t.testdir({
    a: {
      b: '',
      c: '',
    },
    d: {
      e: '',
      f: '',
    },
  })

  t.strictSame(readDirs(dir), ['a/b', 'a/c', 'd/e', 'd/f'])

  t.chdir(dir)

  spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME], {
    // verify that it works if it's all chunked weird
    input: Buffer.from('a/b\x00./d\x00'),
    env,
  })

  t.strictSame(readDirs(dir), ['a/c'])
})

t.test('no input', async t => {
  const dir = t.testdir({
    a: { b: '' },
  })

  t.chdir(dir)

  spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME], {
    // verify that it works with no input
    env,
  })

  t.strictSame(readDirs(dir), ['a/b'])
})
