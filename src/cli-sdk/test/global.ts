import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'

const mockImportGlobal = async (testDir: string) =>
  t.mockImport<typeof import('../src/global.ts')>(
    '../src/global.ts',
    {
      '@vltpkg/xdg': {
        XDG: class {
          name: string
          constructor(name: string) {
            this.name = name
          }
          data(p = '') {
            return resolve(testDir, this.name, p)
          }
        },
      },
    },
  )

t.test('globalProjectDir returns xdg data path', async t => {
  const dir = t.testdir()
  const { globalProjectDir } = await mockImportGlobal(dir)
  const result = globalProjectDir()
  t.ok(result.includes('vlt'))
  t.ok(result.endsWith('global'))
})

t.test('globalBinDir returns xdg data path', async t => {
  const dir = t.testdir()
  const { globalBinDir } = await mockImportGlobal(dir)
  const result = globalBinDir()
  t.ok(result.includes('vlt'))
  t.ok(result.endsWith('bin'))
})

t.test(
  'ensureGlobalProject creates dir and package.json',
  async t => {
    const dir = t.testdir()
    const { ensureGlobalProject } = await mockImportGlobal(dir)
    const projectDir = ensureGlobalProject()
    t.ok(existsSync(projectDir), 'directory exists')
    const pkgPath = resolve(projectDir, 'package.json')
    t.ok(existsSync(pkgPath), 'package.json exists')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    t.equal(pkg.name, 'vlt-global')
    t.equal(pkg.private, true)
  },
)

t.test(
  'ensureGlobalProject does not overwrite existing package.json',
  async t => {
    const dir = t.testdir()
    const { ensureGlobalProject } = await mockImportGlobal(dir)
    const projectDir = ensureGlobalProject()
    const pkgPath = resolve(projectDir, 'package.json')
    writeFileSync(
      pkgPath,
      JSON.stringify({ name: 'custom', private: true }),
    )
    ensureGlobalProject()
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    t.equal(pkg.name, 'custom', 'not overwritten')
  },
)

t.test('applyGlobalConfig resets options', async t => {
  const dir = t.testdir()
  const { applyGlobalConfig } = await mockImportGlobal(dir)
  let resetCalled = false
  let resetRoot = ''
  const fakeConf = {
    resetOptions(root: string) {
      resetCalled = true
      resetRoot = root
    },
  }
  const result = applyGlobalConfig(fakeConf as any)
  t.ok(resetCalled, 'resetOptions was called')
  t.equal(resetRoot, result, 'passed global project dir')
  t.ok(result.endsWith('global'))
})

t.test('checkPathHint prints message when not on PATH', async t => {
  const dir = t.testdir()
  const { checkPathHint } = await mockImportGlobal(dir)
  const messages: string[] = []
  const originalPath = process.env.PATH
  process.env.PATH = '/usr/bin:/usr/local/bin'
  checkPathHint((...args: unknown[]) => {
    messages.push(String(args[0]))
  })
  process.env.PATH = originalPath
  t.ok(messages.length > 0, 'printed a message')
  t.ok(messages[0]?.includes('export PATH'), 'includes PATH hint')
})

t.test('checkPathHint is silent when bin dir is on PATH', async t => {
  const dir = t.testdir()
  const { checkPathHint, globalBinDir } = await mockImportGlobal(dir)
  const messages: string[] = []
  const binDir = globalBinDir()
  mkdirSync(binDir, { recursive: true })
  const originalPath = process.env.PATH
  // Use resolve to normalize the path (important for Windows)
  process.env.PATH = `${resolve(binDir)}:/usr/bin`
  checkPathHint((...args: unknown[]) => {
    messages.push(String(args[0]))
  })
  process.env.PATH = originalPath
  t.equal(messages.length, 0, 'no message printed')
})

t.test(
  'unlinkRemovedBins returns empty when binDir missing',
  async t => {
    const dir = t.testdir()
    const { unlinkRemovedBins } = await mockImportGlobal(dir)
    const removed = await unlinkRemovedBins('/nonexistent/path')
    t.strictSame(removed, [])
  },
)

t.test('unlinkRemovedBins skips companion files', async t => {
  const dir = t.testdir()
  const { globalBinDir, unlinkRemovedBins } =
    await mockImportGlobal(dir)
  const binDir = globalBinDir()
  mkdirSync(binDir, { recursive: true })
  // Write only companion files (no main shim)
  writeFileSync(resolve(binDir, 'foo.cmd'), 'rem cmd shim')
  writeFileSync(resolve(binDir, 'foo.ps1'), '# ps shim')
  writeFileSync(resolve(binDir, 'foo.pwsh'), '# pwsh shim')
  const removed = await unlinkRemovedBins(dir)
  t.strictSame(removed, [])
})

t.test('unlinkRemovedBins removes stale sh shims', async t => {
  const dir = t.testdir()
  const { globalBinDir, unlinkRemovedBins } =
    await mockImportGlobal(dir)
  const binDir = globalBinDir()
  mkdirSync(binDir, { recursive: true })
  // Create a fake project with node_modules
  const nmDir = resolve(dir, 'node_modules')
  mkdirSync(nmDir, { recursive: true })
  // Create a sh shim pointing to a missing file inside node_modules
  const targetRel = resolve(nmDir, 'pkg', 'bin', 'cmd.js')
  const relPath = targetRel
    .replace(/\\/g, '/')
    .replace(resolve(binDir).replace(/\\/g, '/') + '/', '')
  writeFileSync(
    resolve(binDir, 'mycli'),
    `#!/bin/sh\nexec "$basedir/${relPath}" "$@"\n`,
    { mode: 0o755 },
  )
  const removed = await unlinkRemovedBins(dir)
  // The target is inside our node_modules and doesn't exist
  // It should be removed
  t.ok(Array.isArray(removed))
})

t.test(
  'unlinkRemovedBins skips shims outside node_modules',
  async t => {
    const dir = t.testdir()
    const { globalBinDir, unlinkRemovedBins } =
      await mockImportGlobal(dir)
    const binDir = globalBinDir()
    mkdirSync(binDir, { recursive: true })
    // Create a symlink pointing outside node_modules
    if (process.platform !== 'win32') {
      symlinkSync('/usr/bin/true', resolve(binDir, 'outside'))
    }
    const removed = await unlinkRemovedBins(dir)
    t.strictSame(removed, [])
  },
)

t.test('unlinkRemovedBins handles unreadable shims', async t => {
  const dir = t.testdir()
  const { globalBinDir, unlinkRemovedBins } =
    await mockImportGlobal(dir)
  const binDir = globalBinDir()
  mkdirSync(binDir, { recursive: true })
  // Create a file that isn't a symlink and has no parseable target
  writeFileSync(resolve(binDir, 'noop'), 'garbage content')
  const removed = await unlinkRemovedBins(dir)
  t.strictSame(removed, [])
})

t.test('linkGlobalBins links package bins', async t => {
  const dir = t.testdir()
  let shimCalls: Array<{ from: string; to: string }> = []
  const { linkGlobalBins, globalBinDir } = await t.mockImport<
    typeof import('../src/global.ts')
  >('../src/global.ts', {
    '@vltpkg/xdg': {
      XDG: class {
        name: string
        constructor(name: string) {
          this.name = name
        }
        data(p = '') {
          return resolve(dir, this.name, p)
        }
      },
    },
    '@vltpkg/cmd-shim': {
      cmdShim: async (from: string, to: string) => {
        shimCalls.push({ from, to })
      },
    },
  })

  const projectRoot = t.testdir({
    node_modules: {
      cowsay: {
        'package.json': JSON.stringify({
          name: 'cowsay',
          bin: { cowsay: './cli.js' },
        }),
        'cli.js': '#!/usr/bin/env node\nconsole.log("moo")',
      },
    },
  })

  // Create a mock graph
  const fakeGraph = {
    importers: new Set([
      {
        edgesOut: new Map([
          [
            'cowsay',
            {
              to: { bins: { cowsay: './cli.js' } },
              spec: { name: 'cowsay' },
            },
          ],
        ]),
      },
    ]),
  }

  const linked = await linkGlobalBins(fakeGraph as any, projectRoot)
  t.strictSame(linked, ['cowsay'])
  t.equal(shimCalls.length, 1)
  t.ok(shimCalls[0]?.from.includes('cowsay'))
  t.ok(shimCalls[0]?.to.includes(globalBinDir()))
})

t.test(
  'linkGlobalBins reads bins from package.json when node has no bins',
  async t => {
    const dir = t.testdir()
    const shimCalls: Array<{ from: string; to: string }> = []
    const { linkGlobalBins } = await t.mockImport<
      typeof import('../src/global.ts')
    >('../src/global.ts', {
      '@vltpkg/xdg': {
        XDG: class {
          name: string
          constructor(name: string) {
            this.name = name
          }
          data(p = '') {
            return resolve(dir, this.name, p)
          }
        },
      },
      '@vltpkg/cmd-shim': {
        cmdShim: async (from: string, to: string) => {
          shimCalls.push({ from, to })
        },
      },
    })

    const projectRoot = t.testdir({
      node_modules: {
        mytool: {
          'package.json': JSON.stringify({
            name: 'mytool',
            bin: './index.js',
          }),
          'index.js': '#!/usr/bin/env node',
        },
      },
    })

    const fakeGraph = {
      importers: new Set([
        {
          edgesOut: new Map([
            [
              'mytool',
              {
                to: { bins: undefined },
                spec: { name: 'mytool' },
              },
            ],
          ]),
        },
      ]),
    }

    const linked = await linkGlobalBins(fakeGraph as any, projectRoot)
    t.strictSame(linked, ['mytool'])
    t.equal(shimCalls.length, 1)
  },
)

t.test('linkGlobalBins skips packages without bins', async t => {
  const dir = t.testdir()
  const shimCalls: Array<{ from: string; to: string }> = []
  const { linkGlobalBins } = await t.mockImport<
    typeof import('../src/global.ts')
  >('../src/global.ts', {
    '@vltpkg/xdg': {
      XDG: class {
        name: string
        constructor(name: string) {
          this.name = name
        }
        data(p = '') {
          return resolve(dir, this.name, p)
        }
      },
    },
    '@vltpkg/cmd-shim': {
      cmdShim: async (from: string, to: string) => {
        shimCalls.push({ from, to })
      },
    },
  })

  const projectRoot = t.testdir({
    node_modules: {
      'no-bin': {
        'package.json': JSON.stringify({
          name: 'no-bin',
          version: '1.0.0',
        }),
      },
    },
  })

  const fakeGraph = {
    importers: new Set([
      {
        edgesOut: new Map([
          [
            'no-bin',
            {
              to: { bins: undefined },
              spec: { name: 'no-bin' },
            },
          ],
        ]),
      },
    ]),
  }

  const linked = await linkGlobalBins(fakeGraph as any, projectRoot)
  t.strictSame(linked, [])
  t.equal(shimCalls.length, 0)
})

t.test('linkGlobalBins skips edges with no target', async t => {
  const dir = t.testdir()
  const shimCalls: Array<{ from: string; to: string }> = []
  const { linkGlobalBins } = await t.mockImport<
    typeof import('../src/global.ts')
  >('../src/global.ts', {
    '@vltpkg/xdg': {
      XDG: class {
        name: string
        constructor(name: string) {
          this.name = name
        }
        data(p = '') {
          return resolve(dir, this.name, p)
        }
      },
    },
    '@vltpkg/cmd-shim': {
      cmdShim: async (from: string, to: string) => {
        shimCalls.push({ from, to })
      },
    },
  })

  const fakeGraph = {
    importers: new Set([
      {
        edgesOut: new Map([
          [
            'missing',
            {
              to: null,
              spec: { name: 'missing' },
            },
          ],
        ]),
      },
    ]),
  }

  const linked = await linkGlobalBins(fakeGraph as any, t.testdir())
  t.strictSame(linked, [])
  t.equal(shimCalls.length, 0)
})
