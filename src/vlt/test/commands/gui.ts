import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'
import type { StartGUIOptions } from '../../src/start-gui.js'

t.test('starts gui data and server', async t => {
  let startGUIOptions: StartGUIOptions | undefined
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/gui.js')
  >('../../src/commands/gui.js', {
    '../../src/start-gui.js': {
      startGUI: async (options: StartGUIOptions) => {
        startGUIOptions = options
      },
    },
  })

  t.matchSnapshot((await usage()).usage(), 'usage')

  // workaround for the import.meta.resolve issue not working with tap atm
  const assetsDir = '/path/to/assets'
  await command(
    {
      options: {
        projectRoot: '/path/to/project',
      },
    } as LoadedConfig,
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
