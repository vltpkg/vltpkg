import t, { type Test } from 'tap'
import { type SpawnSyncOptions } from 'node:child_process'
import { readdirSync } from 'node:fs'

type NpmRes = {
  command: string
  args: string[]
  options: SpawnSyncOptions
}

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
  const npm: NpmRes[] = []
  await t.mockImport<typeof import('../../src/bin/publish.ts')>(
    '../../src/bin/publish.ts',
    {
      '../../src/matrix.js': await t.mockImport(
        '../../src/matrix.ts',
        {
          '../../src/compile.js': await t.mockImport(
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
          npm.push({ command, args, options })
        },
      },
    },
  )
  return {
    npm,
    dir,
  }
}

t.test('basic', async t => {
  const { npm, dir } = await publish(t)
  const contents = readdirSync(dir, {
    recursive: true,
    withFileTypes: true,
  })
  t.equal(npm.length, 0)
  t.ok(contents.find(f => f.name.endsWith('vlt.js')))
})

t.test('pack', async t => {
  const { npm } = await publish(t, ['--action=pack'])
  t.equal(npm[0]!.args[0], 'pack')
})

t.test('publish', async t => {
  const { npm } = await publish(t, ['--action=publish'])
  t.equal(npm[0]!.args[0], 'publish')
  t.ok(npm[0]!.args.includes('--dry-run'))
})

t.test('live publish', async t => {
  t.intercept(process, 'env', {
    value: {
      ...process.env,
      VLT_CLI_PUBLISH_TOKEN: 'mytoken',
    },
  })
  const { npm } = await publish(t, ['--action=publish', '--forReal'])
  t.equal(npm[0]!.args[0], 'publish')
  t.notOk(npm[0]!.args.includes('--dry-run'))
})
