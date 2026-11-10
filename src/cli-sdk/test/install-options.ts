import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import { installOptions } from '../src/install-options.ts'

t.test('installOptions', async t => {
  const conf = {
    options: {
      projectRoot: '/p',
      'frozen-lockfile': true,
      'expect-lockfile': false,
      'lockfile-only': true,
    },
    values: { 'save-exact': true, 'save-prefix': '~' },
    get: (k: string) =>
      k === 'skills-dir' ? ['.agents/skills']
      : k === 'allow-scripts' ? '#a'
      : undefined,
  } as unknown as LoadedConfig
  t.strictSame(installOptions(conf), {
    projectRoot: '/p',
    'frozen-lockfile': true,
    'expect-lockfile': false,
    'lockfile-only': true,
    frozenLockfile: true,
    expectLockfile: false,
    allowScripts: '#a',
    skillsDirs: ['.agents/skills'],
    lockfileOnly: true,
    saveExact: true,
    savePrefix: '~',
  })
})
