import * as fsp from 'node:fs/promises'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PassThrough } from 'node:stream'
import t from 'tap'
import type { Test } from 'tap'
import type { GlobalBins } from '../../src/global.ts'
import {
  globalStateFile,
  readGlobalState,
} from '../../src/global-state.ts'
import { fishPath, posixPath, prettyPath } from '../../src/shell.ts'
import type { Shell } from '../../src/shell.ts'
import {
  envFile,
  envFishFile,
  renderEnv,
  renderEnvFish,
} from '../../src/shell-setup/env.ts'
import { renderBlock } from '../../src/shell-setup/posix.ts'
import {
  applyPathSetup,
  canSetupPath,
  pathSetupChanged,
  pathSetupFiles,
  pathSetupLines,
  planPathSetup,
  rcList,
  sourceCommand,
} from '../../src/shell-setup/index.ts'
import type { PathSetupOptions } from '../../src/shell-setup/index.ts'

const posix = process.platform !== 'win32'

type Dir = NonNullable<Parameters<typeof t.testdir>[0]>

const setup = (t: Test, home: Dir = {}) => {
  const root = t.testdir({ home, g: { bin: {} } })
  const g = resolve(root, 'g')
  return {
    root,
    home: resolve(root, 'home'),
    globalDir: g,
    bin: resolve(g, 'bin'),
  }
}

const opts = (
  t: Test,
  shell: Shell,
  home: Dir = {},
  platform: NodeJS.Platform = 'linux',
) => {
  const s = setup(t, home)
  const o: PathSetupOptions = {
    globalDir: s.globalDir,
    dir: s.bin,
    shell,
    env: {},
    home: s.home,
    platform,
  }
  return { ...s, o }
}

const read = (f: string) => readFileSync(f, 'utf8')

t.test('canSetupPath', async t => {
  for (const shell of ['bash', 'zsh', 'fish', 'sh'] as const) {
    t.equal(canSetupPath(shell, 'linux'), true, shell)
    t.equal(canSetupPath(shell, 'darwin'), true, shell)
    t.equal(canSetupPath(shell, 'win32'), false, shell)
  }
  for (const shell of ['nu', 'unknown', 'pwsh', 'cmd'] as const) {
    t.equal(canSetupPath(shell, 'linux'), false, shell)
  }
  t.intercept(process, 'platform', { value: 'linux' })
  t.equal(canSetupPath('zsh'), true, 'default platform')
})

t.test('planPathSetup unsupported', async t => {
  const o = {
    globalDir: '/g',
    dir: '/opt/b',
    env: {},
    home: '/home/me',
    platform: 'linux',
  } as const
  await t.rejects(planPathSetup({ ...o, shell: 'nu' }), {
    message: `vlt setup --path doesn't support nu yet. Add it to your PATH yourself:\n  $env.PATH = ($env.PATH | prepend "/opt/b")`,
    cause: { code: 'ECONFIG', found: 'nu' },
  })
  await t.rejects(planPathSetup({ ...o, shell: 'unknown' }), {
    message: `vlt setup --path doesn't support your shell yet. Add it to your PATH yourself:\n  export PATH="/opt/b:$PATH"`,
  })
  await t.rejects(
    planPathSetup({ ...o, shell: 'bash', platform: 'win32' }),
    { message: /^vlt setup --path doesn't support Windows yet/ },
  )
  t.intercept(process, 'platform', { value: 'win32' })
  await t.rejects(
    planPathSetup({ ...o, shell: 'zsh', platform: undefined }),
    { message: /doesn't support Windows/ },
    'default platform',
  )
})

t.test('zsh: plan, apply, again, new dir', async t => {
  const { home, globalDir, bin, o } = opts(t, 'zsh')
  const zshrc = resolve(home, '.zshrc')
  const plan = await planPathSetup(o)
  t.strictSame(pathSetupFiles(plan), [
    { file: envFile(globalDir), kind: 'env', action: 'create' },
    { file: envFishFile(globalDir), kind: 'env', action: 'create' },
    { file: zshrc, kind: 'rc', action: 'create' },
  ])
  t.equal(pathSetupChanged(plan), true)
  t.strictSame(await applyPathSetup(plan), {
    dir: bin,
    shell: 'zsh',
    files: pathSetupFiles(plan),
    backups: [],
  })
  t.equal(read(envFile(globalDir)), renderEnv(bin, o))
  t.equal(read(envFishFile(globalDir)), renderEnvFish(bin, o))
  t.equal(read(zshrc), renderBlock('zsh', globalDir, o) + '\n')
  t.notOk(existsSync(resolve(globalDir, 'backups')), 'no backups')
  t.strictSame(readdirSync(home), ['.zshrc'], 'no tmp left')

  t.equal(pathSetupChanged(await planPathSetup(o)), false, 'again')

  const other = resolve(home, 'other')
  const moved = await planPathSetup({ ...o, dir: other })
  t.strictSame(
    pathSetupFiles(moved).map(f => f.action),
    ['replace', 'replace', 'unchanged'],
    'only rewrites env',
  )
  await applyPathSetup(moved)
  t.equal(read(envFile(globalDir)), renderEnv(other, o))
  t.equal(read(zshrc), renderBlock('zsh', globalDir, o) + '\n')
})

t.test('bash without rc files: only .profile', async t => {
  const { home, o } = opts(t, 'bash')
  const plan = await planPathSetup(o)
  t.strictSame(
    pathSetupFiles(plan)
      .filter(f => f.kind === 'rc')
      .map(f => f.file),
    [resolve(home, '.profile')],
  )
  await applyPathSetup(plan)
  t.strictSame(readdirSync(home), ['.profile'])
})

t.test('bash: existing .bashrc appended, backed up', async t => {
  const { home, globalDir, o } = opts(t, 'bash', {
    '.bashrc': '# mine\n',
  })
  const bashrc = resolve(home, '.bashrc')
  if (posix) chmodSync(bashrc, 0o600)
  const plan = await planPathSetup(o)
  const r = await applyPathSetup(plan)
  t.equal(
    read(bashrc),
    `# mine\n\n${renderBlock('bash', globalDir, o)}\n`,
  )
  t.equal(r.backups.length, 1)
  const [backup = ''] = r.backups
  t.equal(dirname(backup), resolve(globalDir, 'backups'))
  t.match(
    backup,
    /[\\/]bashrc\.\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d+Z\.bak$/,
    'not hidden',
  )
  t.equal(read(backup), '# mine\n')
  if (posix) {
    t.equal(statSync(bashrc).mode & 0o777, 0o600, 'mode kept')
    t.equal(statSync(backup).mode & 0o777, 0o600, 'backup mode')
  }
})

t.test('fish: conf.d file sources env.fish', async t => {
  const { home, globalDir, o } = opts(t, 'fish')
  o.env = { XDG_CONFIG_HOME: resolve(home, 'cfg') }
  const file = resolve(home, 'cfg/fish/conf.d/vlt.fish')
  await applyPathSetup(await planPathSetup(o))
  t.equal(read(file), renderBlock('fish', globalDir, o) + '\n')
  t.match(read(file), fishPath(envFishFile(globalDir), o))
})

t.test('space in dirs round-trips quoted', async t => {
  const root = t.testdir({ 'a b': { home: {}, g: {} } })
  const home = resolve(root, 'a b', 'home')
  const globalDir = resolve(root, 'a b', 'g')
  const dir = resolve(home, 'Application Support', 'bin')
  const env = { XDG_CONFIG_HOME: resolve(home, 'c') }
  for (const shell of ['zsh', 'fish'] as const) {
    const o = {
      globalDir,
      dir,
      shell,
      env,
      home,
      platform: 'darwin',
    } as const
    await applyPathSetup(await planPathSetup(o))
  }
  const o = { home, platform: 'darwin' } as const
  t.equal(read(envFile(globalDir)), renderEnv(dir, o))
  t.equal(read(envFishFile(globalDir)), renderEnvFish(dir, o))
  t.match(
    read(resolve(home, '.zshrc')),
    posixPath(envFile(globalDir), o),
  )
  t.match(
    read(resolve(home, 'c/fish/conf.d/vlt.fish')),
    fishPath(envFishFile(globalDir), o),
  )
  if (posix) {
    t.match(
      read(envFile(globalDir)),
      '"$HOME/Application Support/bin"',
    )
    t.match(
      read(envFishFile(globalDir)),
      'contains -- "$HOME/Application Support/bin" $PATH; or set -gx PATH "$HOME/Application Support/bin" $PATH',
    )
    t.match(read(resolve(home, '.zshrc')), `"${globalDir}/env" ]`)
  }
})

t.test('symlinked rc', async t => {
  const { home, globalDir, o } = opts(t, 'zsh', {
    'real-zshrc': 'x\n',
    '.zshrc': t.fixture('symlink', 'real-zshrc'),
  })
  const zshrc = resolve(home, '.zshrc')
  const plan = await planPathSetup(o)
  t.strictSame(
    pathSetupFiles(plan)
      .filter(f => f.kind === 'rc')
      .map(f => f.file),
    [await fsp.realpath(zshrc)],
    'the target is edited',
  )
  const r = await applyPathSetup(plan)
  t.ok(lstatSync(zshrc).isSymbolicLink(), 'link kept')
  t.equal(
    read(resolve(home, 'real-zshrc')),
    `x\n\n${renderBlock('zsh', globalDir, o)}\n`,
  )
  t.match(r.backups[0], /real-zshrc\..*\.bak$/)
})

t.test('links to one file edit it once', async t => {
  const { home, o } = opts(t, 'bash', {
    '.bashrc': 'x\n',
    '.bash_profile': t.fixture('symlink', '.bashrc'),
  })
  const plan = await planPathSetup(o)
  const bashrc = await fsp.realpath(resolve(home, '.bashrc'))
  t.strictSame(
    pathSetupFiles(plan)
      .filter(f => f.kind === 'rc')
      .map(f => f.file),
    [bashrc],
  )
})

t.test(
  'new rc file and dirs owned like the home dir, as root',
  async t => {
    const chowns: unknown[][] = []
    const mod = await t.mockImport<
      typeof import('../../src/shell-setup/index.ts')
    >('../../src/shell-setup/index.ts', {
      'node:fs/promises': t.createMock(fsp, {
        chown: async (...a: unknown[]) => {
          chowns.push(a)
        },
      }),
    })
    const { home, o } = opts(t, 'fish')
    const cfg = resolve(home, 'cfg')
    o.env = { XDG_CONFIG_HOME: cfg }
    const { uid, gid } = statSync(home)
    t.intercept(process, 'getuid', { value: () => 0 })
    await mod.applyPathSetup(await mod.planPathSetup(o))
    t.strictSame(chowns, [
      [resolve(cfg, 'fish/conf.d/vlt.fish'), uid, gid],
      [resolve(cfg, 'fish/conf.d'), uid, gid],
      [resolve(cfg, 'fish'), uid, gid],
      [cfg, uid, gid],
    ])
  },
)

t.test('owner kept as root', async t => {
  const chowns: unknown[][] = []
  const mod = await t.mockImport<
    typeof import('../../src/shell-setup/index.ts')
  >('../../src/shell-setup/index.ts', {
    'node:fs/promises': t.createMock(fsp, {
      chown: async (...a: unknown[]) => {
        chowns.push(a)
      },
    }),
  })
  const { home, o } = opts(t, 'zsh', { '.zshrc': 'x\n' })
  const zshrc = resolve(home, '.zshrc')
  const st = statSync(zshrc)
  for (const [uid, called] of [
    [() => 0, true],
    [() => 1000, false],
    [undefined, false],
  ] as const) {
    chowns.length = 0
    writeFileSync(zshrc, 'x\n')
    t.intercept(process, 'getuid', { value: uid })
    await mod.applyPathSetup(await mod.planPathSetup(o))
    t.strictSame(
      chowns,
      called ? [[zshrc, st.uid, st.gid]] : [],
      `getuid: ${String(uid?.())}`,
    )
  }
})

t.test('rcList, sourceCommand, pathSetupLines', async t => {
  t.equal(
    rcList(
      [
        { file: '/home/me/.bashrc', kind: 'rc', action: 'append' },
        { file: '/g/env', kind: 'env', action: 'create' },
        { file: '/home/me/.profile', kind: 'rc', action: 'create' },
      ],
      '/home/me',
    ),
    '~/.bashrc, ~/.profile',
  )
  const o = { home: '/home/me', platform: 'linux' } as const
  const g = '/home/me/g'
  t.equal(sourceCommand('sh', g, o), `. ${posixPath(envFile(g), o)}`)
  for (const shell of ['bash', 'zsh'] as const) {
    t.equal(
      sourceCommand(shell, g, o),
      `source ${posixPath(envFile(g), o)}`,
    )
  }
  t.equal(
    sourceCommand('fish', g, o),
    `source ${fishPath(envFishFile(g), o)}`,
  )
  t.match(sourceCommand('zsh', g), /^source "/)
  if (posix) {
    t.equal(sourceCommand('sh', g, o), '. "$HOME/g/env"')
  }

  const r = {
    dir: '/home/me/b',
    shell: 'zsh',
    files: [
      { file: '/home/me/.zshrc', kind: 'rc', action: 'create' },
    ],
    backups: [],
  } as const
  t.strictSame(
    pathSetupLines(
      { ...r, files: [...r.files], backups: [] },
      'source x',
      '/home/me',
    ),
    [
      '✅ Added ~/b to your PATH in ~/.zshrc',
      '   Open a new terminal, or run: source x',
    ],
  )
  t.strictSame(
    pathSetupLines(
      {
        ...r,
        files: [...r.files],
        backups: ['/home/me/g/backups/zshrc.1.bak'],
      },
      'source x',
      '/home/me',
    ).at(-1),
    '   Backups in ~/g/backups',
  )
})

// mocked prompt; `answer` throws when an Error
const load = async (
  t: Test,
  answer: string | Error | (() => string) = '',
  mocks: Record<string, unknown> = {},
) => {
  const asked: string[] = []
  const rls: { input: unknown; output: unknown }[] = []
  const mod = await t.mockImport<
    typeof import('../../src/shell-setup/index.ts')
  >('../../src/shell-setup/index.ts', {
    'node:readline/promises': {
      createInterface: (io: { input: unknown; output: unknown }) => {
        rls.push(io)
        return {
          question: async (q: string) => {
            asked.push(q)
            if (answer instanceof Error) throw answer
            return typeof answer === 'function' ? answer() : answer
          },
          close: () => {},
        }
      },
    },
    ...mocks,
  })
  return { mod, asked, rls }
}

t.test('ask', async t => {
  const { mod, asked, rls } = await load(t, '  y \n')
  const input = new PassThrough()
  let paused = 0
  input.pause = () => {
    paused++
    return input
  }
  const output = new PassThrough()
  t.equal(await mod.ask('Q? ', { input, output }), 'y')
  t.strictSame(asked, ['Q? '])
  t.equal(paused, 1)
  t.equal(rls[0]?.input, input)
  t.intercept(process.stdin, 'pause', { value: () => process.stdin })
  await mod.ask('R? ')
  t.equal(rls[1]?.input, process.stdin, 'default input')
  t.equal(rls[1]?.output, process.stdout, 'default output')
})

t.test('offerPathSetup', async t => {
  const g = (o: Partial<GlobalBins> = {}): GlobalBins => ({
    binDir: '',
    source: 'global-dir',
    bins: ['a'],
    conflicts: [],
    inPath: false,
    otherDirs: [],
    ...o,
  })
  const io = (inTTY = true, outTTY = true) => {
    const written: string[] = []
    const input = Object.assign(new PassThrough(), { isTTY: inTTY })
    const output = Object.assign(new PassThrough(), {
      isTTY: outTTY,
      write: (s: string) => {
        written.push(s)
        return true
      },
    })
    return { input, output, written }
  }
  const fixture = (t: Test) => {
    const s = setup(t)
    let before = 0
    const { input, output, written } = io()
    const base = {
      globalDir: s.globalDir,
      env: { SHELL: '/bin/zsh' },
      home: s.home,
      platform: 'linux',
      input,
      output,
      beforeOutput: () => {
        before++
      },
    } as const
    return {
      ...s,
      base,
      written,
      before: () => before,
      gb: g({ binDir: s.bin }),
      zshrc: resolve(s.home, '.zshrc'),
      rcs: prettyPath(resolve(s.home, '.zshrc'), s.home),
      source: sourceCommand('zsh', s.globalDir, base),
    }
  }

  t.test('early returns', async t => {
    const { mod, asked } = await load(t, 'y')
    const cases: [
      string,
      (f: ReturnType<typeof fixture>) => Promise<void>,
    ][] = [
      [
        'noModifyPath',
        f =>
          mod.offerPathSetup(f.gb, { ...f.base, noModifyPath: true }),
      ],
      [
        'inPath',
        f => mod.offerPathSetup({ ...f.gb, inPath: true }, f.base),
      ],
      [
        'nothing linked',
        f => mod.offerPathSetup({ ...f.gb, bins: [] }, f.base),
      ],
      [
        'input not a tty',
        f =>
          mod.offerPathSetup(f.gb, {
            ...f.base,
            input: io(false).input,
          }),
      ],
      [
        'output not a tty',
        f =>
          mod.offerPathSetup(f.gb, {
            ...f.base,
            output: io(true, false).output,
          }),
      ],
      [
        'CI',
        f =>
          mod.offerPathSetup(f.gb, {
            ...f.base,
            env: { SHELL: '/bin/zsh', CI: 'true' },
          }),
      ],
      [
        'declined',
        async f => {
          writeFileSync(
            globalStateFile(f.globalDir),
            '{"pathSetup":"declined"}',
          )
          await mod.offerPathSetup(f.gb, f.base)
        },
      ],
      [
        'nu',
        f =>
          mod.offerPathSetup(f.gb, {
            ...f.base,
            env: { SHELL: '/usr/bin/nu' },
          }),
      ],
      [
        'win32',
        f =>
          mod.offerPathSetup(f.gb, {
            ...f.base,
            env: { SHELL: '/bin/bash' },
            platform: 'win32',
          }),
      ],
    ]
    for (const [name, run] of cases) {
      const f = fixture(t)
      await run(f)
      t.strictSame(f.written, [], name)
      t.equal(f.before(), 0, `${name}: output untouched`)
      t.notOk(existsSync(f.zshrc), `${name}: nothing written`)
      t.notOk(existsSync(envFile(f.globalDir)), `${name}: no env`)
    }
    t.strictSame(asked, [])
  })

  t.test('conflicts only still offers', async t => {
    const { mod, asked } = await load(t, 'n')
    const f = fixture(t)
    await mod.offerPathSetup(
      { ...f.gb, bins: [], conflicts: ['c'] },
      f.base,
    )
    t.strictSame(asked, [`Add it to ${f.rcs} now? (Y/n) `])
  })

  t.test('default io and env', async t => {
    const { mod } = await load(t)
    t.intercept(process.stdin, 'isTTY', { value: false })
    const f = fixture(t)
    await mod.offerPathSetup(f.gb, { globalDir: f.globalDir })
    t.notOk(existsSync(envFile(f.globalDir)))
  })

  t.test('already added', async t => {
    const { mod, asked } = await load(t, 'y')
    const f = fixture(t)
    await applyPathSetup(
      await planPathSetup({ ...f.base, dir: f.bin, shell: 'zsh' }),
    )
    await mod.offerPathSetup(f.gb, f.base)
    t.strictSame(f.written, [
      '\n',
      `ℹ️  It's already added in ${f.rcs}: open a new terminal, or run: ${f.source}\n`,
    ])
    t.equal(f.before(), 1)
    t.strictSame(asked, [])
  })

  t.test('--yes', async t => {
    const { mod, asked } = await load(t, 'n')
    const f = fixture(t)
    const { beforeOutput: _, ...base } = f.base
    await mod.offerPathSetup(f.gb, { ...base, yes: true })
    t.strictSame(asked, [])
    t.ok(existsSync(f.zshrc))
    t.strictSame(f.written, [
      '\n',
      `✅ Added ${prettyPath(f.bin, f.home)} to your PATH in ${f.rcs}\n`,
      `   Open a new terminal, or run: ${f.source}\n`,
    ])
  })

  t.test('answer no is remembered', async t => {
    const { mod, asked } = await load(t, 'No')
    const f = fixture(t)
    writeFileSync(globalStateFile(f.globalDir), '{"binDirs":[]}')
    await mod.offerPathSetup(f.gb, f.base)
    t.strictSame(asked, [`Add it to ${f.rcs} now? (Y/n) `])
    t.equal(f.before(), 1)
    t.strictSame(f.written, ['\n'], 'blank line before the prompt')
    t.notOk(existsSync(f.zshrc))
    t.strictSame(await readGlobalState(f.globalDir), {
      binDirs: [],
      pathSetup: 'declined',
    })
  })

  t.test('state write failure swallowed', async t => {
    const { mod } = await load(t, 'n')
    const f = fixture(t)
    mkdirSync(globalStateFile(f.globalDir))
    await t.resolves(mod.offerPathSetup(f.gb, f.base))
    t.notOk(existsSync(f.zshrc))
  })

  for (const answer of ['', 'y', 'YES']) {
    t.test(`answer ${JSON.stringify(answer)}`, async t => {
      const { mod } = await load(t, answer)
      const f = fixture(t)
      await mod.offerPathSetup(f.gb, f.base)
      t.ok(existsSync(f.zshrc))
      t.match(f.written[1], /^✅ Added /)
    })
  }

  t.test('rc edited while asking is kept', async t => {
    const f = fixture(t)
    writeFileSync(f.zshrc, 'x\n')
    const { mod } = await load(t, () => {
      writeFileSync(f.zshrc, 'x\ny\n')
      return 'y'
    })
    await mod.offerPathSetup(f.gb, f.base)
    t.equal(
      read(f.zshrc),
      `x\ny\n\n${renderBlock('zsh', f.globalDir, f.base)}\n`,
    )
    const backups = resolve(f.globalDir, 'backups')
    const [b = ''] = readdirSync(backups)
    t.equal(read(resolve(backups, b)), 'x\ny\n')
  })

  t.test('question rejects', async t => {
    const { mod } = await load(t, new Error('closed'))
    const f = fixture(t)
    await mod.offerPathSetup(f.gb, f.base)
    t.strictSame(f.written, ['\n'])
    t.notOk(existsSync(f.zshrc))
  })

  t.test('apply fails', async t => {
    const { mod } = await load(t, 'y', {
      '../../src/global-state.ts': {
        ...(await import('../../src/global-state.ts')),
        writeFileAtomic: async () => {
          throw new Error('boom')
        },
      },
    })
    const f = fixture(t)
    await t.resolves(mod.offerPathSetup(f.gb, f.base))
    t.strictSame(f.written, [
      '\n',
      '⚠️  Could not add it to your PATH: boom\n',
    ])
  })
})
