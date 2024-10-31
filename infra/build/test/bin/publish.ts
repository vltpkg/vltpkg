import { join } from 'node:path'
import t, { type Test } from 'tap'
import { spawnSync, type SpawnSyncOptions } from 'node:child_process'
import { type Bin, BinNames } from '../../src/types.js'
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
      'publish.js',
      `--outdir=${dir}`,
      ...argv,
    ],
  })
  const res: SpawnRes[] = []
  await t.mockImport<typeof import('../../src/bin/publish.js')>(
    '../../src/bin/publish.js',
    {
      '../../src/matrix.js': await t.mockImport(
        '../../src/matrix.js',
        {
          '../../src/compile.js': await t.mockImport(
            '../../src/compile.js',
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

await t.test('format', async t => {
  t.skip('cjs', async t => {
    const { dirs } = await publish(t, ['--format=cjs'])
    const pkg = JSON.parse(
      readFileSync(join(dirs[0] ?? '', 'package.json'), 'utf8'),
    )
    t.equal(pkg.type, 'commonjs')
  })
  t.test('esm', async t => {
    const { dirs } = await publish(t, ['--format=esm'])
    const pkg = JSON.parse(
      readFileSync(join(dirs[0] ?? '', 'package.json'), 'utf8'),
    )
    t.equal(pkg.type, 'module')
  })
})
