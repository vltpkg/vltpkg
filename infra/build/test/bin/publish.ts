import { join } from 'node:path'
import t, { Test } from 'tap'
import { spawnSync, SpawnSyncOptions } from 'node:child_process'
import { BinName, BinNames } from '../../src/types.js'
import { readdirSync, readFileSync } from 'node:fs'

type SpawnRes = { stderr: string[]; stdout: string[] }

const findBin = (res: SpawnRes[], bin: BinName) =>
  res.find(r => r.stdout[0]?.match(new RegExp(`${bin}@`)))

const hasBinFile = (
  r: SpawnRes | undefined,
  bin: BinName,
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
              const { stderr, stdout } = spawnSync(command, args, {
                ...options,
                stdio: 'pipe',
                encoding: 'utf8',
              })
              res.push({
                stderr: parseOutput(stderr),
                stdout: parseOutput(stdout),
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

await t.test('bins', async t => {
  const { res } = await publish(t)
  t.equal(res.length, 4)
  for (const [binName, output] of BinNames.map(
    bin => [bin, findBin(res, bin)] as const,
  )) {
    if (binName === 'vlix') {
      t.notOk(output)
    } else {
      const hasBins = BinNames.map(
        bin => [bin, hasBinFile(output, bin)] as const,
      )
      if (binName === 'vlt') {
        t.ok(Object.values(hasBins).every(Boolean))
      } else {
        for (const [hasBinName, hasBin] of hasBins) {
          t[hasBinName === binName ? 'ok' : 'notOk'](
            hasBin,
            hasBinName,
          )
        }
      }
    }
  }
})

await t.test('compile', async t => {
  const { res } = await publish(t, ['--compile=true', '--bins=vlt'])
  t.equal(res.length, 1)
  const hasBins = BinNames.map(bin => hasBinFile(res[0], bin, true))
  t.ok(hasBins.every(Boolean))
})

await t.test('format', async t => {
  const { dirs } = await publish(t, ['--format=cjs'])
  const pkg = JSON.parse(
    readFileSync(join(dirs[0] ?? '', 'package.json'), 'utf8'),
  )
  t.equal(pkg.type, 'commonjs')
})
