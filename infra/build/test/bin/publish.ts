import { join } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { spawnSync } from 'node:child_process'
import type { SpawnSyncOptions } from 'node:child_process'
import { BinNames } from '../../src/types.ts'
import type { Bin } from '../../src/types.ts'
import { readdirSync, readFileSync } from 'node:fs'

type SpawnRes = { stderr: string[]; stdout: string[] }

const hasBinFile = (
  r: SpawnRes | undefined,
  bin: Bin,
  compiled = false,
) =>
  r?.stderr.find(v =>
    new RegExp(`${bin}${compiled ? '' : '\\.js'}$`).exec(v),
  )

const parseOutput = (s: string) =>
  s
    .split('\n')
    .map(v => v.replace(/^npm notice ?/, ''))
    .filter(Boolean)

const publish = async (t: Test, argv: string[] = []) => {
  const dir = t.testdir()
  t.capture(console, 'log').args
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      'publish.ts',
      `--outdir=${dir}`,
      ...argv,
    ],
  })
  const res: SpawnRes[] = []
  await t.mockImport<typeof import('../../src/bin/publish.ts')>(
    '../../src/bin/publish.ts',
    {
      '../../src/matrix.ts': await t.mockImport(
        '../../src/matrix.ts',
        {
          '../../src/compile.ts': await t.mockImport(
            '../../src/compile.ts',
            {
              'node:child_process': {
                spawnSync: () => ({
                  status: 0,
                }),
              },
            },
          ),
        },
      ),
      'node:child_process': {
        spawnSync: (
          command: string,
          args: string[],
          options: SpawnSyncOptions,
        ) => {
          switch (command) {
            case 'op': {
              const id = 'TOKENS'
              return {
                stdout: JSON.stringify({
                  sections: [{ label: 'tokens', id }],
                  fields: BinNames.map(label => ({
                    section: { id },
                    label,
                    value: `npm_${label}-token`,
                  })),
                }),
              }
            }
            case 'npm': {
              const r = spawnSync(command, args, {
                ...options,
                stdio: 'pipe',
                encoding: 'utf8',
              })
              res.push({
                stderr: parseOutput(r.stderr),
                stdout: parseOutput(r.stdout),
              })
              return
            }
            default:
              throw new Error('unexpected spawnSync call')
          }
        },
      },
    },
  )
  return {
    res,
    dirs: readdirSync(dir, { withFileTypes: true })
      .filter(f => f.isDirectory())
      .map(f => join(dir, f.name)),
  }
}

await t.skip('compile', async t => {
  const { res } = await publish(t, ['--compile=true'])
  t.equal(res.length, 1)
  const hasBins = BinNames.map(bin => hasBinFile(res[0], bin, true))
  t.ok(hasBins.every(Boolean))
})

t.test('publisj', async t => {
  const { dirs } = await publish(t)
  const pkg = JSON.parse(
    readFileSync(join(dirs[0] ?? '', 'package.json'), 'utf8'),
  )
  t.equal(pkg.type, 'module')
})
