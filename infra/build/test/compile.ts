import t from 'tap'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

t.test('basic', async t => {
  const { compile } = await t.mockImport<
    typeof import('../src/compile.ts')
  >('../src/compile.ts')
  const dir = t.testdir()
  const res = await compile({
    outdir: dir,
    bins: ['vlt'],
    quiet: true,
  })
  const contents = readdirSync(res.outdir)
  t.ok(
    contents.includes(
      `vlt${process.platform === 'win32' ? '.exe' : ''}`,
    ),
  )
  t.notOk(
    contents.includes(
      `vlr${process.platform === 'win32' ? '.exe' : ''}`,
    ),
  )
})

t.test('not quiet', async t => {
  const dir = t.testdir()
  let spawnArgs: string[] = []
  const { compile } = await t.mockImport<
    typeof import('../src/compile.ts')
  >('../src/compile.ts', {
    'node:child_process': {
      spawnSync: (_: string, args: string[]) => {
        spawnArgs = args
        writeFileSync(join(dir, 'vlt'), '')
        return { status: 0 }
      },
    },
  })
  await compile({
    outdir: dir,
    bins: ['vlt'],
  })
  t.notOk(spawnArgs.includes('--quiet'))
})
