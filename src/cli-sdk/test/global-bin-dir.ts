import * as cmdShim from '@vltpkg/cmd-shim'
import { existsSync, realpathSync } from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as os from 'node:os'
import { delimiter, dirname, resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import type { InstallReceipt } from '../src/install-receipt.ts'
import { setupEnv } from './fixtures/util.ts'

setupEnv(t)

let whichResult: string | null | Error = null
const whichCalls: string[] = []
let shimTarget: string | undefined
const denied = new Set<string>()
let receipt: InstallReceipt | undefined
const receiptArgs: string[] = []
let home = ''

const { findSelf, isInPathRealpath, resolveGlobalBinDir } =
  await t.mockImport<typeof import('../src/global-bin-dir.ts')>(
    '../src/global-bin-dir.ts',
    {
      '@vltpkg/which': {
        which: async (cmd: string) => {
          whichCalls.push(cmd)
          if (whichResult instanceof Error) throw whichResult
          return whichResult
        },
      },
      '@vltpkg/cmd-shim': t.createMock(cmdShim, {
        findCmdShimIfExists: async (p: string) =>
          shimTarget ?
            ([p, shimTarget] as [string, string])
          : undefined,
      }),
      'node:fs/promises': t.createMock(fsp, {
        access: async (p: string, mode?: number) => {
          if (denied.has(resolve(p))) {
            throw Object.assign(new Error('denied'), {
              code: 'EACCES',
            })
          }
          return fsp.access(p, mode)
        },
      }),
      'node:os': t.createMock(os, { homedir: () => home }),
      '../src/install-receipt.ts': {
        readInstallReceipt: async (found: string) => {
          receiptArgs.push(found)
          return receipt
        },
      },
    },
  )

t.beforeEach(() => {
  whichResult = null
  whichCalls.length = 0
  shimTarget = undefined
  denied.clear()
  receipt = undefined
  receiptArgs.length = 0
  home = ''
})

const real = (p: string) => realpathSync.native(p)

const fixture = (t: Test) => {
  const root = t.testdir({
    pkg: { 'vlt.js': '', 'other.js': '' },
    bin: { vlt: t.fixture('symlink', '../pkg/vlt.js') },
    volta: {
      'volta-shim': '',
      vlt: t.fixture('symlink', 'volta-shim'),
    },
    sa: { vlt: '' },
    win: { 'vlt.cmd': '', 'vlt.exe': '' },
    proj: {
      node_modules: {
        '.bin': { vlt: t.fixture('symlink', '../../../pkg/vlt.js') },
      },
    },
    // separate dir, case-insensitive fs
    proj2: {
      Node_Modules: {
        '.Bin': { vlt: t.fixture('symlink', '../../../pkg/vlt.js') },
      },
    },
    nmlink: t.fixture('symlink', 'proj/node_modules/.bin'),
    real: { bin: { vlt: t.fixture('symlink', '../../pkg/vlt.js') } },
    shell: t.fixture('symlink', 'real'),
    home: {},
    g: {},
    node: '',
  })
  return (...p: string[]) => resolve(root, ...p)
}

const setSelf = (
  t: Test,
  found: string | null | Error,
  {
    PATH = typeof found === 'string' ? dirname(found) : '',
    argv1 = typeof found === 'string' ? found : undefined,
    execPath,
  }: { PATH?: string; argv1?: string; execPath?: string } = {},
) => {
  whichResult = found
  process.env.PATH = PATH
  t.intercept(process, 'argv', {
    value: [process.execPath, ...(argv1 ? [argv1] : [])],
  })
  if (execPath) t.intercept(process, 'execPath', { value: execPath })
}

t.test('findSelf', async t => {
  t.test('not found', async t => {
    fixture(t)
    setSelf(t, null)
    t.equal(await findSelf(), undefined)
    t.strictSame(whichCalls, ['vlt'])
  })

  t.test('which throws', async t => {
    fixture(t)
    setSelf(t, new Error('x'))
    t.equal(await findSelf(), undefined)
  })

  t.test('relative', async t => {
    fixture(t)
    setSelf(t, 'bin/vlt', { PATH: 'bin' })
    t.equal(await findSelf(), undefined)
  })

  t.test('dir not in PATH (win32 cwd lookup)', async t => {
    const r = fixture(t)
    setSelf(t, r('bin/vlt'), { PATH: '' })
    t.equal(await findSelf(), undefined)
  })

  t.test('missing dir in PATH', async t => {
    const r = fixture(t)
    setSelf(t, r('gone/vlt'))
    t.equal(await findSelf(), undefined)
  })

  t.test('node_modules/.bin', async t => {
    const r = fixture(t)
    setSelf(t, r('proj/node_modules/.bin/vlt'))
    t.equal(await findSelf(), undefined, 'PATH spelling')
    setSelf(t, r('nmlink/vlt'))
    t.equal(await findSelf(), undefined, 'symlinked PATH entry')
  })

  t.test('node_modules/.bin, case-insensitive on win32', async t => {
    const r = fixture(t)
    t.intercept(process, 'platform', { value: 'win32' })
    setSelf(t, r('proj2/Node_Modules/.Bin/vlt'))
    t.equal(await findSelf(), undefined)
  })

  t.test('symlink to the running script', async t => {
    const r = fixture(t)
    setSelf(t, r('bin/vlt'))
    t.strictSame(await findSelf(), {
      found: r('bin/vlt'),
      dir: real(r('bin')),
      target: real(r('pkg/vlt.js')),
      standalone: false,
    })
  })

  t.test('execPath unresolvable', async t => {
    const r = fixture(t)
    setSelf(t, r('bin/vlt'), { execPath: r('gone') })
    t.equal((await findSelf())?.standalone, false)
  })

  t.test('standalone executable', async t => {
    const r = fixture(t)
    setSelf(t, r('sa/vlt'), { execPath: r('sa/vlt') })
    t.strictSame(await findSelf(), {
      found: r('sa/vlt'),
      dir: real(r('sa')),
      target: real(r('sa/vlt')),
      standalone: true,
    })
  })

  t.test('standalone, no argv[1]', async t => {
    const r = fixture(t)
    setSelf(t, r('sa/vlt'), { execPath: r('sa/vlt'), argv1: '' })
    t.equal((await findSelf())?.standalone, true)
    setSelf(t, r('bin/vlt'), { argv1: '' })
    t.equal(await findSelf(), undefined, 'script needs argv[1]')
  })

  t.test('a different vlt', async t => {
    const r = fixture(t)
    setSelf(t, r('bin/vlt'), { argv1: r('pkg/other.js') })
    t.equal(await findSelf(), undefined)
  })

  t.test('volta shim', async t => {
    const r = fixture(t)
    setSelf(t, r('volta/vlt'), { argv1: r('pkg/vlt.js') })
    t.equal(await findSelf(), undefined)
  })

  t.test('win32 vlt.cmd', async t => {
    const r = fixture(t)
    setSelf(t, r('win/vlt.cmd'), { argv1: r('pkg/vlt.js') })
    t.equal(await findSelf(), undefined, 'no shim target')
    shimTarget = r('pkg/gone.js')
    t.equal(await findSelf(), undefined, 'missing shim target')
    shimTarget = r('pkg/vlt.js')
    t.strictSame(await findSelf(), {
      found: r('win/vlt.cmd'),
      dir: real(r('win')),
      target: real(r('pkg/vlt.js')),
      standalone: false,
    })
  })

  t.test('win32 vlt.exe', async t => {
    const r = fixture(t)
    setSelf(t, r('win/vlt.exe'), { execPath: r('win/vlt.exe') })
    t.equal((await findSelf())?.standalone, true)
  })

  t.test('symlinked PATH entry (fnm)', async t => {
    const r = fixture(t)
    setSelf(t, r('shell/bin/vlt'))
    t.equal((await findSelf())?.dir, real(r('real/bin')))
  })

  t.test('receipt', async t => {
    const r = fixture(t)
    setSelf(t, r('shell/bin/vlt'))
    receipt = {
      file: r('install-receipt.json'),
      data: { receiptVersion: 1, method: 'npm', binDir: r('bin') },
    }
    t.strictSame((await findSelf())?.receipt, receipt)
    t.strictSame(receiptArgs, [r('shell/bin/vlt')], 'PATH spelling')
  })
})

t.test('isInPathRealpath', async t => {
  const r = fixture(t)
  const dir = r('real/bin')
  t.equal(await isInPathRealpath(dir, dir), true, 'string match')
  t.equal(
    await isInPathRealpath(
      dir,
      ['', r('gone'), r('shell/bin')].join(delimiter),
    ),
    true,
    'symlinked entry',
  )
  t.equal(
    await isInPathRealpath(
      dir,
      ['', r('gone'), r('bin')].join(delimiter),
    ),
    false,
  )
  t.equal(
    await isInPathRealpath(r('gone'), r('bin')),
    false,
    'missing dir',
  )

  t.test('defaults to process.env.PATH', async t => {
    process.env.PATH = r('shell/bin')
    t.equal(await isInPathRealpath(dir), true)
    delete process.env.PATH
    t.equal(await isInPathRealpath(dir), false)
  })

  const darwin = { skip: process.platform !== 'darwin' }
  t.test('darwin /private and case', darwin, async t => {
    const tmp = await fsp.mkdtemp(resolve(os.tmpdir(), 'vlt-'))
    t.teardown(() => fsp.rm(tmp, { recursive: true, force: true }))
    t.equal(await isInPathRealpath(real(tmp), tmp), true, '/private')
    t.equal(
      await isInPathRealpath(dir, dir.toUpperCase()),
      true,
      'case',
    )
  })
})

t.test('resolveGlobalBinDir', async t => {
  const posix = (t: Test) =>
    t.intercept(process, 'platform', { value: 'linux' })

  t.test('config', async t => {
    const r = fixture(t)
    setSelf(t, r('bin/vlt'))
    const globalBinDir = r('shell/x/y')
    t.notOk(existsSync(globalBinDir))
    process.env.PATH = globalBinDir
    const res = await resolveGlobalBinDir({
      projectRoot: r('g'),
      globalBinDir,
    })
    t.strictSame(res, {
      dir: real(r('real/x/y')),
      source: 'config',
      inPath: true,
    })
    t.strictSame(whichCalls, [], 'self not looked up')
    t.equal(process.env.VLT_GLOBAL_BIN_DIR, res.dir)

    process.env.PATH = ''
    t.equal(
      (
        await resolveGlobalBinDir({
          projectRoot: r('g'),
          globalBinDir,
        })
      ).inPath,
      false,
    )
  })

  t.test('config not creatable', async t => {
    const r = fixture(t)
    await t.rejects(
      resolveGlobalBinDir({
        projectRoot: r('g'),
        globalBinDir: r('node/x'),
      }),
      {
        message: 'Could not create global-bin-dir',
        cause: { code: 'ECONFIG', found: r('node/x') },
      },
    )
  })

  t.test('config not writable', async t => {
    const r = fixture(t)
    denied.add(r('g/b'))
    await t.rejects(
      resolveGlobalBinDir({
        projectRoot: r('g'),
        globalBinDir: r('g/b'),
      }),
      {
        message: 'global-bin-dir is not writable',
        cause: { code: 'ECONFIG', found: r('g/b') },
      },
    )
  })

  t.test('self', async t => {
    const r = fixture(t)
    setSelf(t, r('shell/bin/vlt'))
    t.strictSame(await resolveGlobalBinDir({ projectRoot: r('g') }), {
      dir: real(r('real/bin')),
      source: 'self',
      inPath: true,
    })
    t.equal(process.env.VLT_GLOBAL_BIN_DIR, real(r('real/bin')))
  })

  t.test('self not writable', async t => {
    const local = (r: (...p: string[]) => string) =>
      r('home/.local/bin')
    const global = (r: (...p: string[]) => string) => ({
      dir: real(r('g/bin')),
      source: 'global-dir',
      inPath: false,
      notWritable: real(r('bin')),
    })

    t.test('~/.local/bin', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      await fsp.mkdir(local(r), { recursive: true })
      setSelf(t, r('bin/vlt'), {
        PATH: [r('bin'), local(r)].join(delimiter),
      })
      denied.add(real(r('bin')))
      t.strictSame(
        await resolveGlobalBinDir({ projectRoot: r('g') }),
        {
          dir: real(local(r)),
          source: 'local-bin',
          inPath: true,
          notWritable: real(r('bin')),
        },
      )
    })

    t.test('~/.local/bin missing', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      setSelf(t, r('bin/vlt'), {
        PATH: [r('bin'), local(r)].join(delimiter),
      })
      denied.add(real(r('bin')))
      t.strictSame(
        await resolveGlobalBinDir({ projectRoot: r('g') }),
        global(r),
      )
      t.notOk(existsSync(local(r)), 'not created')
    })

    t.test('~/.local/bin a file', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      await fsp.mkdir(r('home/.local'))
      await fsp.writeFile(local(r), '')
      setSelf(t, r('bin/vlt'), {
        PATH: [r('bin'), local(r)].join(delimiter),
      })
      denied.add(real(r('bin')))
      t.strictSame(
        await resolveGlobalBinDir({ projectRoot: r('g') }),
        global(r),
      )
    })

    t.test('~/.local/bin not in PATH', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      await fsp.mkdir(local(r), { recursive: true })
      setSelf(t, r('bin/vlt'))
      denied.add(real(r('bin')))
      t.strictSame(
        await resolveGlobalBinDir({ projectRoot: r('g') }),
        global(r),
      )
    })

    t.test('~/.local/bin not writable', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      await fsp.mkdir(local(r), { recursive: true })
      setSelf(t, r('bin/vlt'), {
        PATH: [r('bin'), local(r)].join(delimiter),
      })
      denied.add(real(r('bin')))
      denied.add(local(r))
      t.strictSame(
        await resolveGlobalBinDir({ projectRoot: r('g') }),
        global(r),
      )
    })

    t.test('win32 skips ~/.local/bin', async t => {
      t.intercept(process, 'platform', { value: 'win32' })
      const r = fixture(t)
      home = r('home')
      await fsp.mkdir(local(r), { recursive: true })
      setSelf(t, r('bin/vlt'), {
        PATH: [r('bin'), local(r)].join(delimiter),
      })
      denied.add(real(r('bin')))
      t.strictSame(
        await resolveGlobalBinDir({ projectRoot: r('g') }),
        global(r),
      )
    })

    t.test('self dir is ~/.local/bin', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      await fsp.mkdir(local(r), { recursive: true })
      await fsp.symlink(r('pkg/vlt.js'), resolve(local(r), 'vlt'))
      setSelf(t, resolve(local(r), 'vlt'), { argv1: r('pkg/vlt.js') })
      t.strictSame(
        await resolveGlobalBinDir(
          { projectRoot: r('g') },
          { selfUnwritable: true },
        ),
        { ...global(r), notWritable: real(local(r)) },
      )
    })

    t.test('selfUnwritable', async t => {
      posix(t)
      const r = fixture(t)
      home = r('home')
      setSelf(t, r('bin/vlt'))
      t.strictSame(
        await resolveGlobalBinDir(
          { projectRoot: r('g') },
          { selfUnwritable: true },
        ),
        global(r),
      )
    })
  })

  t.test('no self', async t => {
    const r = fixture(t)
    setSelf(t, null)
    t.strictSame(await resolveGlobalBinDir({ projectRoot: r('g') }), {
      dir: real(r('g/bin')),
      source: 'global-dir',
      inPath: false,
    })
    t.equal(process.env.VLT_GLOBAL_BIN_DIR, real(r('g/bin')))
  })

  t.test('no self, global dir via a symlink in PATH', async t => {
    const r = fixture(t)
    setSelf(t, null)
    await fsp.symlink(
      r('g'),
      r('glink'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    process.env.PATH = r('glink/bin')
    t.strictSame(await resolveGlobalBinDir({ projectRoot: r('g') }), {
      dir: real(r('g/bin')),
      source: 'global-dir',
      inPath: true,
    })
  })
})
