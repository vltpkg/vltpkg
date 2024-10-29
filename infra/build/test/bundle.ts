import t, { Test } from 'tap'
import { ESLint } from 'eslint'
import globals from 'globals'
import { relative, sep, join } from 'path'
import * as types from '../src/types.js'
import { defaultOptions } from '../src/index.js'
import bundle, { IMPORT_META } from '../src/bundle.js'

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
        'no-restricted-syntax': [
          2,
          ...Object.values(IMPORT_META).map(message => ({
            message,
            selector: [
              'MemberExpression',
              `[object.type='MetaProperty']`,
              `[object.property.name='meta']`,
              `[property.name='${message.replace('import.meta.', '')}']`,
            ].join(''),
          })),
        ],
      },
    },
    overrideConfig: [
      {
        files: ['**/gui/*.js'],
        languageOptions: {
          globals: {
            ...globals.browser,
            // These are used by 3rd party deps that we do
            // not control but don't pose any runtime problems.
            global: false,
            setImmediate: false,
            MSApp: false,
            checkDCE: false,
            IS_REACT_ACT_ENVIRONMENT: false,
            __REACT_DEVTOOLS_GLOBAL_HOOK__: false,
          },
        },
      },
    ],
  })
  const results = await eslint.lintFiles([
    `${relative(dir, outdir)}/**/*.js`,
  ])
  for (const result of results) {
    const messages = result.messages.map(m => [m.ruleId, m.message])
    const file = relative(outdir, result.filePath)
    const expected =
      file.startsWith(`gui${sep}`) ?
        []
        // 1 use of import.meta.dirname is expected in all our built esm files
      : [['no-restricted-syntax', IMPORT_META.Dirname]]
    t.strictSame(messages, expected, file)
  }
})
