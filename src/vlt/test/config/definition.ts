import t from 'tap'
import {
  commands,
  definition,
  isRecordField,
  recordFields,
  getCommand,
} from '../../src/config/definition.ts'
import { setupEnv } from '../fixtures/run.ts'

t.matchSnapshot(commands, 'commands')
const defObj = definition.toJSON()
// strip out all the defaults, because that's platform-specific
t.matchSnapshot(
  Object.fromEntries(
    Object.entries(defObj).map(([k, v]) => {
      const { default: _def, ...def } = v
      return [k, def]
    }),
  ),
  'definition',
)

for (const r of recordFields) t.equal(isRecordField(r), true)
t.equal(isRecordField('editor'), false)

t.test(
  'stop parsing at first positional after certain commands',
  t => {
    const { values, positionals } = definition.parse([
      '-c',
      'run',
      '-C',
      'xyz',
      '-c',
    ])
    t.hasStrict(values, { color: false })
    t.strictSame(positionals, ['run', 'xyz', '-c'])
    t.end()
  },
)

t.test('identity can only be lowercase alphanum', async t => {
  t.throws(() => {
    definition.parse(['-i', 'AS.R#I@HAWXv'])
  })
  const { values } = definition.parse(['-i', 'asdf123'])
  t.equal(values.identity, 'asdf123')
})

t.test('infer editor from env/platform', async t => {
  const cases: [
    { platform: NodeJS.Platform; EDITOR?: string; VISUAL?: string },
    RegExp | string,
  ][] = [
    [
      { platform: 'win32', EDITOR: undefined, VISUAL: undefined },
      /notepad\.exe$/,
    ],
    [
      { platform: 'linux', EDITOR: undefined, VISUAL: undefined },
      'vi',
    ],
    [
      { platform: 'linux', EDITOR: 'EDITOR', VISUAL: undefined },
      'EDITOR',
    ],
    [
      { platform: 'linux', EDITOR: undefined, VISUAL: 'VISUAL' },
      'VISUAL',
    ],
    [
      { platform: 'linux', EDITOR: 'EDITOR', VISUAL: 'VISUAL' },
      'EDITOR',
    ],
  ]
  t.plan(cases.length)
  const cleanEnv = setupEnv(t)
  for (const [{ platform, EDITOR, VISUAL }, expect] of cases) {
    t.test(`${platform} ${EDITOR} ${VISUAL}`, async t => {
      t.intercept(process, 'env', {
        value: { ...cleanEnv, EDITOR, VISUAL },
      })
      t.intercept(process, 'platform', { value: platform })
      const { definition } = await t.mockImport<
        typeof import('../../src/config/definition.ts')
      >('../../src/config/definition.ts')
      t.match(definition.parse().values.editor, expect)
    })
  }
})

t.test('getCommand', async t => {
  t.equal(getCommand('__wut__'), undefined)
  t.equal(getCommand(), undefined)
  t.equal(getCommand('?'), 'help')
})
