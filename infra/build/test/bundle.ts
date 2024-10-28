import t, { Test } from 'tap'
import { ESLint } from 'eslint'
import globals from 'globals'
import { relative, sep, join } from 'path'
import * as types from '../src/types.js'
import { defaultOptions } from '../src/index.js'
import bundle from '../src/bundle.js'

const testBundle = async (
  t: Test,
  {
    testdir,
    ...options
  }: Partial<types.BundleFactors> & { testdir?: object },
) => {
  const dir = t.testdir({ ...testdir, '.build': {} })
  const outdir = join(dir, '.build')
  const { outputs } = await bundle({
    outdir,
    ...defaultOptions(),
    ...options,
  })
  return {
    dir,
    outdir,
    files: Object.keys(outputs).map(p => relative(outdir, p)),
  }
}

t.skip('cjs', async t => {
  await t.resolves(
    testBundle(t, {
      format: types.Formats.Cjs,
    }),
  )
})

t.test('no external commands', async t => {
  const { files: noCommands } = await testBundle(t, {
    externalCommands: false,
  })
  t.notOk(noCommands.some(c => c.startsWith(`commands${sep}`)))
})

t.test('lint', async t => {
  const { dir, outdir } = await testBundle(t, {
    testdir: {
      'eslint.config.mjs': `export default {}`,
    },
  })
  const eslint = new ESLint({
    cwd: dir,
    allowInlineConfig: false,
    baseConfig: {
      linterOptions: {
        reportUnusedDisableDirectives: false,
      },
      languageOptions: {
        globals: {
          // Only allow globals that are not node specific
          // Anything else should be included with an esbuild banner
          ...globals['shared-node-browser'],
          // These are used by 3rd party deps that we do
          // not control but don't pose any runtime problems.
          window: false,
          define: false,
          textLen: true,
        },
      },
      rules: {
        'no-undef': 'error',
      },
    },
  })
  const results = await eslint.lintFiles([
    `${relative(dir, outdir)}/**/*.js`,
  ])
  t.strictSame(
    [
      ...new Set(
        results.flatMap(r => r.messages.map(m => m.message)),
      ),
    ],
    [],
  )
})
