import t from 'tap'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import build from '../src/bundle.js'
import { defaultOptions } from '../src/index.js'
import globals from 'globals'

t.test('lint', async t => {
  const dir = t.testdir({
    'eslint.config.mjs': `export default {}`,
    '.build': {},
  })
  await build({
    outdir: join(dir, '.build'),
    ...defaultOptions(),
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
  const results = await eslint.lintFiles([`.build/**/*.js`])
  t.strictSame(
    [
      ...new Set(
        results.flatMap(r => r.messages.map(m => m.message)),
      ),
    ],
    [],
  )
})
