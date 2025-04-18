import { spawnSync } from 'node:child_process'
import t from 'tap'
import { join } from 'node:path'
import { readdirSync } from 'node:fs'
import { __CODE_SPLIT_SCRIPT_NAME } from '../src/remove.ts'

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

  const readDirs = () =>
    readdirSync(dir, { withFileTypes: true })
      .flatMap(r =>
        readdirSync(join(r.parentPath, r.name), {
          withFileTypes: true,
        }),
      )
      .map(d => join(d.parentPath, d.name))
      .sort()

  t.strictSame(
    readDirs(),
    ['a/b', 'a/c', 'd/e', 'd/f'].map(d => join(dir, d)),
  )

  t.chdir(dir)

  spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME], {
    // verify that it works if it's all chunked weird
    input: Buffer.from('a/b\x00./d\x00'),
    env: {
      ...process.env,
      NODE_OPTIONS: '--no-warnings --experimental-strip-types',
    },
  })

  t.strictSame(readDirs(), [join(dir, 'a/c')])
})
