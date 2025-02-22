import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ViewOptions } from '../../src/view.ts'

const inited: string[] = []
const { usage, command, views } = await t.mockImport<
  typeof import('../../src/commands/init.ts')
>('../../src/commands/init.ts', {
  '@vltpkg/init': {
    init: async ({ cwd }: { cwd: string }) => {
      inited.push(cwd)
    },
    getAuthorFromGitUser() {
      return ''
    },
  },
})

t.matchSnapshot(usage().usageMarkdown())

t.test('test command', async t => {
  t.chdir(t.testdir())
  await command({} as unknown as LoadedConfig)
  t.strictSame(inited, [t.testdirName])
})

t.test('human output', t => {
  t.matchSnapshot(
    views.human(
      {
        manifest: {
          path: '/some/path',
          data: { name: 'myproject' },
        },
      },
      {} as unknown as ViewOptions,
      {} as unknown as LoadedConfig,
    ),
  )
  t.end()
})
