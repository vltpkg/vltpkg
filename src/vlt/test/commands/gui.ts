import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'
import type { StartGUIOptions } from '../../src/start-gui.js'

t.test('starts gui data and server', async t => {
  let startGUIOptions: StartGUIOptions | undefined
  const { usage, command } = await t.mockImport(
    '../../src/commands/gui.js',
    {
      '../../src/start-gui.js': {
        startGUI: async (options: StartGUIOptions) => {
          startGUIOptions = options
        },
      },
    },
  )

  t.type(usage, 'string')

  // workaround for the import.meta.resolve issue not working with tap atm
  const assetsDir = '/path/to/assets'
  await command(
    {
      options: {
        projectRoot: '/path/to/project',
      },
    } as unknown as LoadedConfig,
    undefined,
    assetsDir,
  )

  t.matchStrict(
    startGUIOptions,
    {
      conf: { options: { projectRoot: '/path/to/project' } },
      assetsDir: '/path/to/assets',
    },
    'should call startGUI with expected options',
  )
})
