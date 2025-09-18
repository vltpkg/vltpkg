import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { VltServerListening } from '@vltpkg/server'

const mockServer = {
  port: 8001,
  address: (path?: string) => `http://localhost:8001${path ?? '/'}`,
  close: async () => {},
  on: () => {},
} as unknown as VltServerListening

t.test('usage', async t => {
  const { usage } = await t.mockImport<
    typeof import('../../src/commands/serve.ts')
  >('../../src/commands/serve.ts')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
})

t.test('views', async t => {
  t.test('human view', async t => {
    const output: string[] = []
    const { views } = await t.mockImport<
      typeof import('../../src/commands/serve.ts')
    >('../../src/commands/serve.ts', {
      '../../src/output.ts': {
        stdout: (...args: any[]) => output.push(args.join(' ')),
        stderr: () => {},
        styleTextStdout: (_styles: any, text: string) => text,
        styleTextStderr: (_styles: any, text: string) => text,
      },
    })

    views.human({
      guiPort: 8001,
      registryPort: 1337,
      uiURL: 'http://localhost:8001',
      registryURL: 'http://localhost:1337',
    })

    t.match(output, [
      '',
      ' vlt serve running ',
      '',
      'UI Server:       http://localhost:8001',
      'VSR Registry:    http://localhost:1337',
      '',
      'Press Ctrl+C to stop both servers',
    ])
  })

  t.test('json view', async t => {
    const { views } = await t.mockImport<
      typeof import('../../src/commands/serve.ts')
    >('../../src/commands/serve.ts')

    const result = {
      guiPort: 8001,
      registryPort: 1337,
      uiURL: 'http://localhost:8001',
      registryURL: 'http://localhost:1337',
    }
    t.strictSame(views.json(result), result)
  })
})

t.test('command server startup', async t => {
  let startGUICalled = false
  let vlxResolveCalled = false
  let execCommandCalled = false
  let onExitCalled = false
  const positionals: string[] = []

  const { command } = await t.mockImport<
    typeof import('../../src/commands/serve.ts')
  >('../../src/commands/serve.ts', {
    '../../src/start-gui.ts': {
      startGUI: async () => {
        startGUICalled = true
        return mockServer
      },
    },
    '@vltpkg/vlx': {
      resolve: async (args: string[]) => {
        vlxResolveCalled = true
        t.strictSame(args, ['@vltpkg/vsr'])
        return 'resolved-vsr-binary'
      },
    },
    '../../src/exec-command.ts': {
      ExecCommand: class {
        constructor(conf: any, _exec: any, _execFG: any) {
          execCommandCalled = true
          // Simulate setting positionals as the real implementation does
          positionals.push(...conf.positionals)
        }
        async run() {
          return {
            status: 0,
            signal: null,
            stdout: 'VSR started',
            stderr: '',
            command: 'vsr',
            args: [],
            cwd: '/test',
          }
        }
      },
    },
    'signal-exit': {
      onExit: (_cb: () => void) => {
        onExitCalled = true
        // Don't actually call the callback in tests
        return () => {} // cleanup function
      },
    },
    '../../src/output.ts': {
      stdout: () => {},
      stderr: () => {},
      styleTextStdout: (_styles: any, text: string) => text,
      styleTextStderr: (_styles: any, text: string) => text,
    },
  })

  const conf = {
    get: (key: string) => {
      if (key === 'port') return 8001
      if (key === 'registry-port') return 1337
      return undefined
    },
    options: {
      projectRoot: '/test/project',
      packageJson: {} as any,
    },
    positionals: [],
  } as unknown as LoadedConfig

  const result = await command(conf)

  // Verify servers were started
  t.equal(startGUICalled, true, 'GUI server was started')
  t.equal(vlxResolveCalled, true, 'vlx.resolve was called')
  t.equal(execCommandCalled, true, 'ExecCommand was created')
  t.equal(onExitCalled, true, 'onExit was called for cleanup')

  // Verify positionals were set correctly
  t.equal(
    conf.positionals[0],
    'resolved-vsr-binary',
    'VSR binary was resolved',
  )

  // Verify result
  t.strictSame(result, {
    guiPort: 8001,
    registryPort: 1337,
    uiURL: 'http://localhost:8001',
    registryURL: 'http://localhost:1337',
  })
})

t.test('command - missing GUI port', async t => {
  // Create a fresh mock server with undefined port for this test only
  const mockServerWithoutPort = {
    port: undefined,
    address: (path?: string) => `http://localhost:8001${path ?? '/'}`,
    close: async () => {},
    on: () => {},
  } as unknown as VltServerListening

  const { command } = await t.mockImport<
    typeof import('../../src/commands/serve.ts')
  >('../../src/commands/serve.ts', {
    '../../src/start-gui.ts': {
      startGUI: async () => {
        return mockServerWithoutPort
      },
    },
    '../../src/output.ts': {
      stdout: () => {},
      stderr: () => {},
      styleTextStdout: (_styles: any, text: string) => text,
      styleTextStderr: (_styles: any, text: string) => text,
    },
  })

  const conf = {
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {} as any,
    },
    positionals: [],
  } as unknown as LoadedConfig

  await t.rejects(command(conf), 'missing ui server port')
})

t.test('command - uses default ports', async t => {
  let resolvedArgs: string[] = []

  // Create a fresh mock server with default port for this test
  const mockServerWithDefaultPort = {
    port: 8001,
    address: (path?: string) => `http://localhost:8001${path ?? '/'}`,
    close: async () => {},
    on: () => {},
  } as unknown as VltServerListening

  const { command } = await t.mockImport<
    typeof import('../../src/commands/serve.ts')
  >('../../src/commands/serve.ts', {
    '../../src/start-gui.ts': {
      startGUI: async () => mockServerWithDefaultPort,
    },
    '@vltpkg/vlx': {
      resolve: async (args: string[]) => {
        resolvedArgs = args
        return 'resolved-vsr-binary'
      },
    },
    '../../src/exec-command.ts': {
      ExecCommand: class {
        async run() {
          return {
            status: 0,
            signal: null,
            stdout: '',
            stderr: '',
            command: 'vsr',
            args: [],
            cwd: '/test',
          }
        }
      },
    },
    'signal-exit': {
      onExit: () => () => {},
    },
    '../../src/output.ts': {
      stdout: () => {},
      stderr: () => {},
      styleTextStdout: (_styles: any, text: string) => text,
      styleTextStderr: (_styles: any, text: string) => text,
    },
  })

  const conf = {
    get: () => undefined, // Return undefined for all options (use defaults)
    options: {
      projectRoot: '/test/project',
      packageJson: {} as any,
    },
    positionals: [],
  } as unknown as LoadedConfig

  const result = await command(conf)

  // VSR should be resolved
  t.strictSame(resolvedArgs, ['@vltpkg/vsr'])

  // Should use default ports
  t.equal(result.guiPort, 8001) // From mock server
  t.equal(result.registryPort, 1337) // Default registry port
})

t.test('command - custom ports', async t => {
  // Create a fresh mock server with custom port for this test
  const mockServerWithCustomPort = {
    port: 9000,
    address: (path?: string) => `http://localhost:9000${path ?? '/'}`,
    close: async () => {},
    on: () => {},
  } as unknown as VltServerListening

  const { command } = await t.mockImport<
    typeof import('../../src/commands/serve.ts')
  >('../../src/commands/serve.ts', {
    '../../src/start-gui.ts': {
      startGUI: async () => {
        return mockServerWithCustomPort
      },
    },
    '@vltpkg/vlx': {
      resolve: async () => 'resolved-vsr-binary',
    },
    '../../src/exec-command.ts': {
      ExecCommand: class {
        async run() {
          return {
            status: 0,
            signal: null,
            stdout: '',
            stderr: '',
            command: 'vsr',
            args: [],
            cwd: '/test',
          }
        }
      },
    },
    'signal-exit': {
      onExit: () => () => {},
    },
    '../../src/output.ts': {
      stdout: () => {},
      stderr: () => {},
      styleTextStdout: (_styles: any, text: string) => text,
      styleTextStderr: (_styles: any, text: string) => text,
    },
  })

  const conf = {
    get: (key: string) => {
      if (key === 'port') return 9000
      if (key === 'registry-port') return 2000
      return undefined
    },
    options: {
      projectRoot: '/test/project',
      packageJson: {} as any,
    },
    positionals: [],
  } as unknown as LoadedConfig

  const result = await command(conf)

  t.equal(result.guiPort, 9000)
  t.equal(result.registryPort, 2000)
  t.equal(result.uiURL, 'http://localhost:9000')
  t.equal(result.registryURL, 'http://localhost:2000')
})
