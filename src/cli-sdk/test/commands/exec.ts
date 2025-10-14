import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import type { PromptFn, VlxOptions } from '@vltpkg/vlx'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ExecResult } from '../../src/exec-command.ts'

t.test('prettpath', async t => {
  const { prettyPath } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
    'node:os': t.createMock(await import('node:os'), {
      homedir: () => '/a/b/c',
    }),
  })
  unload()
  t.equal(prettyPath('/a/b/c/d/e/f'), '~/d/e/f')
  t.equal(prettyPath('/b/c/d/e/f'), '/b/c/d/e/f')
})

t.test('promptFn', async t => {
  let askedQuestion = false
  const { promptFn } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
    'node:readline/promises': {
      createInterface: (stdin: unknown, stdout: unknown) => {
        t.equal(stdin, process.stdin)
        t.equal(stdout, process.stdout)
        return {
          question: async (prompt: unknown) => {
            askedQuestion = true
            t.matchSnapshot(prompt)
            return 'yes'
          },
        }
      },
    },
  })
  unload()

  const pauses = t.capture(process.stdin, 'pause').args
  t.equal(
    await promptFn(
      Spec.parse('a@1.2.3'),
      '/some/path',
      'https://registry.npmjs.org/a/a-1.2.3.tgz',
    ),
    'yes',
  )
  t.strictSame(pauses(), [[]])
  t.equal(askedQuestion, true)
})

t.test('usage', async t => {
  const { usage } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts')
  unload()
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
})

t.test('command', async t => {
  let calledResolve = false
  const mockOptions = { 'script-shell': 'this will be deleted' }
  const result = { status: 0, signal: null } as unknown as ExecResult
  const { command } = await t.mockImport<
    typeof import('../../src/commands/exec.ts')
  >('../../src/commands/exec.ts', {
    '../../src/exec-command.ts': {
      views: {},
      ExecCommand: class {
        async run() {
          return result
        }
      },
    },
    '@vltpkg/vlx': {
      resolve: async (
        args: string[],
        options: VlxOptions,
        _promptFn?: PromptFn,
      ) => {
        calledResolve = true
        t.strictSame(args, ['a', 'b', 'c'])
        t.strictSame(options, {
          ...mockOptions,
          query: undefined,
          allowScripts: ':not(*)',
        })
        return 'arg0'
      },
    },
  })
  unload()
  const conf = {
    positionals: ['a', 'b', 'c'],
    options: mockOptions,
    get: (_key: string) => undefined,
  } as unknown as LoadedConfig
  t.equal(await command(conf), result)
  t.equal(calledResolve, true)
  t.strictSame(mockOptions, {})
  t.strictSame(conf.positionals, ['arg0', 'b', 'c'])
})
