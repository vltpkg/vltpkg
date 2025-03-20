import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

t.test('starts gui data and server', async t => {
  let guiConfig: LoadedConfig | undefined
  const { usage, command, views } = await t.mockImport<
    typeof import('../../src/commands/gui.ts')
  >('../../src/commands/gui.ts', {
    '../../src/start-gui.ts': {
      startGUI: async (conf: LoadedConfig) => {
        guiConfig = conf
      },
    },
  })

  t.matchSnapshot(usage().usage(), 'usage')

  const conf = {
    options: {
      projectRoot: '/path/to/project',
    },
  } as LoadedConfig
  const res = await command(conf)
  t.equal(res, null)
  t.equal(
    await views(res as null, {}, conf),
    undefined,
    'prints nothing on completion',
  )

  t.matchStrict(
    guiConfig,
    { options: { projectRoot: '/path/to/project' } },
    'should call startGUI with expected options',
  )
})
