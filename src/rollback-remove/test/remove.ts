import { spawnSync } from 'child_process'
import t from 'tap'
import { join } from 'node:path'
import { readdirSync } from 'fs'
// Needs to be the path to the dist file with .js extension
// so that it can be spawned by node.
// eslint-disable-next-line import/extensions
import { __CODE_SPLIT_SCRIPT_NAME } from '../dist/esm/remove.js'

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
  })

  t.strictSame(readDirs(), [join(dir, 'a/c')])
})
