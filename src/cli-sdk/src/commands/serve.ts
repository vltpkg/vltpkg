import { onExit } from 'signal-exit'
import { error } from '@vltpkg/error-cause'
import { exec, execFG } from '@vltpkg/run'
import * as vlx from '@vltpkg/vlx'
import { ExecCommand } from '../exec-command.ts'
import { commandUsage } from '../config/usage.ts'
import { stdout, styleTextStdout } from '../output.ts'
import { startGUI } from '../start-gui.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'serve',
    usage: '',
    description: `Start a local development server that runs both the browser-based
                  UI server and the VSR (vlt serverless registry) registry instance.

                  The UI server will start first on port 8000 (or the next
                  available port), and then the VSR registry will start on
                  port 1337.

                  This allows you to develop and test the full vlt ecosystem
                  locally, including package publishing and installation from
                  your local registry.`,
    options: {
      port: {
        value: '<number>',
        description:
          'Port for the broser-based UI server (default: 8000)',
      },
      'registry-port': {
        value: '<number>',
        description: 'Port for the VSR registry (default: 1337)',
      },
    },
  })

export type ServeResult = {
  guiPort: number
  registryPort: number
  uiURL: string
  registryURL: string
}

export const views = {
  human: (result: ServeResult) => {
    stdout('')
    stdout(
      styleTextStdout(
        ['bgWhiteBright', 'black', 'bold'],
        ' vlt serve running ',
      ),
    )
    stdout('')
    stdout(`UI Server:       ${result.uiURL}`)
    stdout(`VSR Registry:    ${result.registryURL}`)
    stdout('')
    stdout('Press Ctrl+C to stop both servers')
  },
  json: (result: ServeResult) => result,
} as const satisfies Views<ServeResult>

export const command: CommandFn<ServeResult> = async (
  conf: LoadedConfig,
) => {
  const registryPort = Number(conf.get('registry-port') ?? 1337)

  // Start the GUI server first
  stdout('Starting UI server...')
  const server = await startGUI(conf)
  const actualGuiPort = server.port

  if (!actualGuiPort) {
    throw error('missing ui server port')
  }

  // Start the VSR registry with the GUI server port
  stdout('Starting VSR registry...')

  // Prepare environment for VSR registry
  const registryEnv = {
    ARG_DAEMON: 'true',
    DAEMON_START_SERVER: 'false',
    DAEMON_PORT: String(actualGuiPort),
    DAEMON_URL: `http://localhost:${actualGuiPort}`,
  }

  // runs the exec command internally
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const arg0 = await vlx.resolve(
    ['@vltpkg/vsr'],
    {
      ...conf.options,
      query: undefined,
      allowScripts,
    },
    async () => 'y',
  )
  if (arg0) {
    conf.positionals[0] = arg0
  }
  delete conf.options['script-shell']
  const ex = new ExecCommand(conf, exec, execFG)
  ex.env = registryEnv
  await ex.run()

  // Handle process termination
  /* c8 ignore start */
  const cleanup = () => {
    stdout('\nShutting down servers...')
    try {
      void server.close()
      stdout('UI server stopped')
    } catch {}
  }
  onExit(cleanup)
  /* c8 ignore stop */

  // Return the server information
  const result: ServeResult = {
    guiPort: actualGuiPort,
    registryPort,
    uiURL: `http://localhost:${actualGuiPort}`,
    registryURL: `http://localhost:${registryPort}`,
  }

  // This return will never be reached due to the infinite promise above
  return result
}
