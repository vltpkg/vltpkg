import t from 'tap'
import { type LoadedConfig } from '../../src/config/index.js'
import { type StartGUIOptions } from '../../src/start-gui.js'

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

  t.matchSnapshot(usage().usage(), 'usage')

  await command({
    options: {
      projectRoot: '/path/to/project',
    },
  } as LoadedConfig)

  t.matchStrict(
    startGUIOptions,
    {
      conf: { options: { projectRoot: '/path/to/project' } },
    },
    'should call startGUI with expected options',
  )
})
