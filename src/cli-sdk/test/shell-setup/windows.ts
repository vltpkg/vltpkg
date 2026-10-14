import { error } from '@vltpkg/error-cause'
import { promiseSpawn } from '@vltpkg/promise-spawn'
import { randomBytes } from 'node:crypto'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, win32 } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import type { WindowsPathChange } from '../../src/shell-setup/windows.ts'

type Call = [string, string[], unknown]
type Answer = (args: string[]) => unknown

const regFile = (...values: string[]) =>
  `Windows Registry Editor Version 5.00\r\n\r\n[HKEY_CURRENT_USER\\Environment]\r\n${values.join('\r\n')}\r\n\r\n`

// REG_EXPAND_SZ as reg export writes it, wrapped
const hex2 = (s: string) => {
  const bytes = [...Buffer.from(s + '\0', 'utf16le')].map(b =>
    b.toString(16).padStart(2, '0'),
  )
  const rows: string[] = []
  for (let i = 0; i < bytes.length; i += 25) {
    rows.push(bytes.slice(i, i + 25).join(','))
  }
  return 'hex(2):' + rows.join(',\\\r\n  ')
}

const utf16 = (text: string) =>
  Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(text, 'utf16le'),
  ])

const exportOf =
  (text: string): Answer =>
  args =>
    writeFileSync(args[2]!, utf16(text))

const denied: Answer = () => {
  throw error('command failed', {
    stderr: 'ERROR: Access is denied.',
  })
}

const enoent: Answer = () => {
  throw error('command failed', {
    stderr: '',
    cause: new Error('spawn C:\\Windows\\System32\\reg.exe ENOENT'),
  })
}

// answers by `<exe> <first arg>`
const load = async (
  t: Test,
  answers: Record<string, Answer> = {},
  mocks: Record<string, unknown> = {},
) => {
  const calls: Call[] = []
  const mod = await t.mockImport<
    typeof import('../../src/shell-setup/windows.ts')
  >('../../src/shell-setup/windows.ts', {
    ...mocks,
    '@vltpkg/promise-spawn': {
      promiseSpawn: async (
        cmd: string,
        args: string[],
        opts: unknown,
      ) => {
        calls.push([cmd, args, opts])
        return answers[`${win32.basename(cmd)} ${args[0]}`]?.(args)
      },
    },
  })
  return { mod, calls }
}

const env = { SystemRoot: 'C:\\Windows' }
const sys = 'C:\\Windows\\System32\\'
const hint = (dir: string) =>
  `\n  Add ${dir} yourself: Start > "Edit environment variables for your account" > Path`
// U+2028/9 are line breaks to TAP: label by code
const sep = ['\r', '\u2028', '\u2029'].map(c => ({
  c,
  name: c.charCodeAt(0).toString(16),
}))

t.test('parseRegExport', async t => {
  const { parseRegExport } =
    await import('../../src/shell-setup/windows.ts')
  const parse = (...values: string[]) =>
    parseRegExport(regFile(...values), 'Path')
  const path =
    '%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Zoë\\bin;C:\\日本\\y'
  t.strictSame(parse('"TEMP"="x"', `"Path"=${hex2(path)}`), {
    type: 'REG_EXPAND_SZ',
    data: path,
  })
  t.strictSame(parse('"Path"="C:\\\\a\\\\;D:\\\\b"'), {
    type: 'REG_SZ',
    data: 'C:\\a\\;D:\\b',
  })
  t.strictSame(parse('"PATH"="x"'), { type: 'REG_SZ', data: 'x' })
  for (const { c, name } of sep) {
    t.strictSame(
      parse(`"Path"="C:\\\\a${c}b;D:\\\\t${c}"`),
      { type: 'REG_SZ', data: `C:\\a${c}b;D:\\t${c}` },
      name,
    )
    t.strictSame(
      parse(`"Path"=${hex2(`C:\\a${c}b`)}`),
      { type: 'REG_EXPAND_SZ', data: `C:\\a${c}b` },
      `hex ${name}`,
    )
  }
  t.strictSame(
    parse('"Path"=hex(2):43,00,00,00,6a,00,00,00,00,00'),
    { type: 'REG_EXPAND_SZ', data: 'C\0j' },
    'NUL kept for the caller to refuse',
  )
  t.strictSame(
    parse('"Path"="C:\\\\a', 'D:\\\\b"'),
    { type: '"C', data: '' },
    'line break in data: unknown type',
  )
  t.equal(parse('"PathExt"="x"', '"Pa\\"th"="y"'), undefined)
  for (const v of ['hex(2):00,00', 'hex(2):', '""']) {
    t.equal(parse(`"Path"=${v}`)?.data, '', v)
  }
  t.strictSame(parse('"Path"=dword:00000001'), {
    type: 'dword',
    data: '',
  })
  t.strictSame(parse('"Path"=hex(7):41,00,00,00,00,00'), {
    type: 'hex(7)',
    data: '',
  })
  t.equal(
    parse(
      '"TEMP"="x"',
      '',
      '[HKEY_CURRENT_USER\\Environment\\Sub]',
      '"Path"="y"',
    ),
    undefined,
    'only in a subkey',
  )
  t.equal(parse('"TEMP"="x"'), undefined, 'absent')
})

t.test('expandEnv', async t => {
  const { expandEnv } =
    await import('../../src/shell-setup/windows.ts')
  const e = { USERPROFILE: 'C:\\Users\\me', X: undefined }
  t.equal(expandEnv('%USERPROFILE%\\a', e), 'C:\\Users\\me\\a')
  t.equal(expandEnv('%userprofile%\\a', e), 'C:\\Users\\me\\a')
  t.equal(expandEnv('%NOPE%\\a', e), '%NOPE%\\a')
  t.equal(expandEnv('%X%', e), '%X%')
  t.equal(expandEnv('C:\\a', e), 'C:\\a')
  t.equal(expandEnv('C:\\a'), 'C:\\a', 'default env')
})

t.test('addPathEntry', async t => {
  const { addPathEntry } =
    await import('../../src/shell-setup/windows.ts')
  const e = { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }
  const dir = 'C:\\Users\\me\\AppData\\Roaming\\vlt\\bin'
  const sz = (data: string) => ({ type: 'REG_SZ', data })
  t.strictSame(addPathEntry(undefined, dir, e), {
    action: 'create',
    data: dir,
  })
  for (const data of [
    `C:\\a;${dir};D:\\b`,
    'C:\\a;%APPDATA%\\vlt\\bin',
    `${dir}\\`,
    'c:/users/ME/appdata/roaming/vlt/bin/',
    `C:\\a; "${dir}" `,
  ]) {
    t.strictSame(
      addPathEntry(sz(data), dir, e),
      { action: 'unchanged', previous: data, data },
      data,
    )
  }
  t.strictSame(addPathEntry(sz('C:\\a;;D:\\b'), dir, e), {
    action: 'prepend',
    previous: 'C:\\a;;D:\\b',
    data: `${dir};C:\\a;;D:\\b`,
  })
  t.strictSame(addPathEntry(sz(''), dir, e), {
    action: 'prepend',
    previous: '',
    data: dir,
  })
  t.equal(
    addPathEntry(sz('C:\\a'), dir).action,
    'prepend',
    'default env',
  )
})

t.test('readUserPath', async t => {
  t.test('reads a temp export', async t => {
    let file = ''
    const { mod, calls } = await load(t, {
      'reg.exe export': args => {
        file = args[2]!
        writeFileSync(file, utf16(regFile(`"Path"=${hex2('C:\\a')}`)))
      },
    })
    t.strictSame(await mod.readUserPath({ env }), {
      type: 'REG_EXPAND_SZ',
      data: 'C:\\a',
    })
    t.strictSame(calls, [
      [
        sys + 'reg.exe',
        ['export', 'HKCU\\Environment', file, '/y'],
        { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
      ],
    ])
    t.notOk(existsSync(dirname(file)), 'temp dir removed')
  })

  t.test('exe dir and key', async t => {
    const { mod, calls } = await load(t, {
      'reg.exe export': exportOf(regFile()),
    })
    t.equal(
      await mod.readUserPath({
        env: { windir: 'D:\\Win' },
        key: 'HKCU\\Software\\x',
      }),
      undefined,
      'Path absent',
    )
    await mod.readUserPath({ env: {} })
    await mod.readUserPath({
      env: { SystemRoot: '', windir: 'D:\\Win' },
    })
    await mod.readUserPath({ env: { SystemRoot: 'Windows' } })
    await mod.readUserPath()
    t.strictSame(
      calls.map(([cmd, args]) => [cmd, args[1]]),
      [
        ['D:\\Win\\System32\\reg.exe', 'HKCU\\Software\\x'],
        [sys + 'reg.exe', 'HKCU\\Environment'],
        ['D:\\Win\\System32\\reg.exe', 'HKCU\\Environment'],
        [sys + 'reg.exe', 'HKCU\\Environment'],
        [
          win32.join(
            process.env.SystemRoot ??
              process.env.windir ??
              'C:\\Windows',
            'System32',
            'reg.exe',
          ),
          'HKCU\\Environment',
        ],
      ],
    )
  })

  t.test('reject removes the temp dir', async t => {
    let file = ''
    const { mod } = await load(t, {
      'reg.exe export': args => {
        file = args[2]!
        writeFileSync(file, 'partial')
        denied(args)
      },
    })
    await t.rejects(mod.readUserPath({ env }), {
      message: 'command failed',
    })
    t.notOk(existsSync(dirname(file)), 'temp dir removed')
  })

  t.test('lone surrogate, NUL', async t => {
    for (const data of [
      hex2('C:\\a\uD800'),
      'hex(2):43,00,00,00,6a,00,00,00',
    ]) {
      const { mod } = await load(t, {
        'reg.exe export': exportOf(regFile(`"Path"=${data}`)),
      })
      await t.rejects(
        mod.readUserPath({ env }),
        { message: 'it has characters vlt could not read' },
        data,
      )
    }
  })

  t.test('temp dir cleanup is best effort', async t => {
    let file = ''
    const { mod } = await load(
      t,
      {
        'reg.exe export': args => {
          file = args[2]!
          writeFileSync(file, utf16(regFile('"Path"="C:\\\\a"')))
        },
      },
      {
        'node:fs/promises': {
          ...(await import('node:fs/promises')),
          rm: async () => {
            throw Object.assign(new Error('busy'), { code: 'EBUSY' })
          },
        },
      },
    )
    t.strictSame(await mod.readUserPath({ env }), {
      type: 'REG_SZ',
      data: 'C:\\a',
    })
    rmSync(dirname(file), { recursive: true, force: true })
  })
})

t.test('planWindowsPath', async t => {
  const dir = 'C:\\Users\\me\\vlt\\bin'

  t.test('dir with ; or %', async t => {
    const { mod, calls } = await load(t)
    for (const d of ['C:\\a;b', 'C:\\%x%']) {
      await t.rejects(mod.planWindowsPath(d, { env }), {
        message: `Could not update your user Path (HKCU\\Environment): the folder name has ";" or "%"\n  Set --global-bin-dir to a folder without them`,
        cause: { code: 'ECONFIG' },
      })
    }
    t.strictSame(calls, [], 'nothing spawned')
  })

  t.test('read fails', async t => {
    const cases: [string, Answer, string][] = [
      ['stderr', denied, 'ERROR: Access is denied.'],
      [
        'spawn error',
        enoent,
        'spawn C:\\Windows\\System32\\reg.exe ENOENT',
      ],
      [
        'plain error',
        () => {
          throw new Error('nope')
        },
        'nope',
      ],
    ]
    for (const [name, answer, why] of cases) {
      const { mod } = await load(t, { 'reg.exe export': answer })
      await t.rejects(
        mod.planWindowsPath(dir, { env }),
        {
          message: `Could not read your user Path (HKCU\\Environment): ${why}${hint(dir)}`,
          cause: { code: 'ECONFIG', cause: Error },
        },
        name,
      )
    }
  })

  t.test('unreadable chars', async t => {
    const { mod } = await load(t, {
      'reg.exe export': exportOf(
        regFile(`"Path"=${hex2('C:\\a\uDC00')}`),
      ),
    })
    await t.rejects(mod.planWindowsPath(dir, { env }), {
      message: `Could not read your user Path (HKCU\\Environment): it has characters vlt could not read${hint(dir)}`,
    })
  })

  t.test('unexpected type', async t => {
    const { mod } = await load(t, {
      'reg.exe export': exportOf(regFile('"Path"=hex(7):00,00')),
    })
    await t.rejects(mod.planWindowsPath(dir, { env }), {
      message: `Could not update your user Path (HKCU\\Environment): unexpected value type hex(7)${hint(dir)}`,
      cause: { code: 'ECONFIG' },
    })
  })

  t.test('create, prepend, unchanged', async t => {
    const plan = async (
      reg: string,
      o: Parameters<
        typeof import('../../src/shell-setup/windows.ts').planWindowsPath
      >[1],
    ) => {
      const { mod } = await load(t, {
        'reg.exe export': exportOf(reg),
      })
      return mod.planWindowsPath(dir, o)
    }
    t.strictSame(await plan(regFile('"TEMP"="x"'), { env }), {
      key: 'HKCU\\Environment',
      dir,
      action: 'create',
      data: dir,
    })
    t.strictSame(
      await plan(regFile('"Path"="C:\\\\a"'), {
        env,
        key: 'HKCU\\Software\\x',
      }),
      {
        key: 'HKCU\\Software\\x',
        dir,
        action: 'prepend',
        previous: 'C:\\a',
        data: `${dir};C:\\a`,
      },
    )
    const prev = '%USERPROFILE%\\vlt\\bin;C:\\a'
    t.strictSame(
      await plan(regFile(`"Path"=${hex2(prev)}`), {
        env: { USERPROFILE: 'C:\\Users\\me' },
      }),
      {
        key: 'HKCU\\Environment',
        dir,
        action: 'unchanged',
        previous: prev,
        data: prev,
      },
    )
    const { mod } = await load(t, {
      'reg.exe export': exportOf(regFile('"Path"="C:\\\\a"')),
    })
    t.match(
      await mod.planWindowsPath(dir),
      { action: 'prepend' },
      'default options',
    )
  })
})

t.test('applyWindowsPath', async t => {
  const c: WindowsPathChange = {
    key: 'HKCU\\Environment',
    dir: 'C:\\x',
    action: 'prepend',
    previous: 'C:\\a',
    data: 'C:\\x;C:\\a',
  }
  const add = [
    sys + 'reg.exe',
    [
      'add',
      'HKCU\\Environment',
      '/v',
      'Path',
      '/t',
      'REG_EXPAND_SZ',
      '/d',
      'C:\\x;C:\\a',
      '/f',
    ],
  ]
  const setx = [sys + 'setx.exe', ['VLT_PATH_REFRESH', '1']]
  const del = [
    sys + 'reg.exe',
    ['delete', 'HKCU\\Environment', '/v', 'VLT_PATH_REFRESH', '/f'],
  ]
  const cmds = (calls: Call[]) =>
    calls.map(([cmd, args]) => [cmd, args])

  t.test('writes, then broadcasts', async t => {
    const { mod, calls } = await load(t)
    await mod.applyWindowsPath(c, { env })
    t.strictSame(cmds(calls), [add, setx, del])
    t.match(calls[0]?.[2], { windowsHide: true })
  })

  t.test('other key: no broadcast', async t => {
    const { mod, calls } = await load(t)
    await mod.applyWindowsPath(
      { ...c, key: 'HKCU\\Software\\x' },
      { env },
    )
    t.strictSame(
      cmds(calls).map(([, args]) => (args as string[])[1]),
      ['HKCU\\Software\\x'],
    )
  })

  t.test('reg add fails', async t => {
    const { mod, calls } = await load(t, { 'reg.exe add': denied })
    await t.rejects(mod.applyWindowsPath(c, { env }), {
      message: `Could not update your user Path (HKCU\\Environment): ERROR: Access is denied.${hint('C:\\x')}`,
      cause: { code: 'ECONFIG', cause: Error },
    })
    t.strictSame(cmds(calls), [add], 'no broadcast')
  })

  t.test('broadcast failures ignored', async t => {
    const setxFails = await load(t, {
      'setx.exe VLT_PATH_REFRESH': denied,
    })
    await t.resolves(setxFails.mod.applyWindowsPath(c, { env }))
    t.strictSame(cmds(setxFails.calls), [add, setx], 'no delete')
    const delFails = await load(t, { 'reg.exe delete': denied })
    await t.resolves(delFails.mod.applyWindowsPath(c, { env }))
    t.strictSame(cmds(delFails.calls), [add, setx, del])
  })

  t.test('default env', async t => {
    const { mod, calls } = await load(t)
    await mod.applyWindowsPath(c)
    t.match(calls[0]?.[0], /[\\/]System32[\\/]reg\.exe$/)
  })
})

t.test(
  'real reg',
  { skip: process.platform !== 'win32' && 'Windows only' },
  async t => {
    const key = `HKCU\\Software\\vltpkg-test-${process.pid}-${randomBytes(4).toString('hex')}`
    t.teardown(() =>
      promiseSpawn('reg', ['delete', key, '/f']).catch(() => {}),
    )
    const reg = (...a: string[]) => promiseSpawn('reg', a)
    const mod = await import('../../src/shell-setup/windows.ts')
    const dir = 'C:\\vlt test\\bin'

    await reg('add', key, '/f')
    const created = await mod.planWindowsPath(dir, { key })
    t.equal(created.action, 'create')
    await mod.applyWindowsPath(created)
    t.strictSame(await mod.readUserPath({ key }), {
      type: 'REG_EXPAND_SZ',
      data: dir,
    })

    // .reg string escapes
    const sz = 'C:\\a\\;"D:\\b c";E:\\f g\\'
    await reg(
      'add',
      key,
      '/v',
      'Path',
      '/t',
      'REG_SZ',
      '/d',
      sz,
      '/f',
    )
    t.strictSame(await mod.readUserPath({ key }), {
      type: 'REG_SZ',
      data: sz,
    })

    const seed = 'C:\\Zoë\\bin;%USERPROFILE%\\x;C:\\日本\\y'
    await reg(
      'add',
      key,
      '/v',
      'Path',
      '/t',
      'REG_EXPAND_SZ',
      '/d',
      seed,
      '/f',
    )
    const p = await mod.planWindowsPath(dir, { key })
    t.equal(p.action, 'prepend')
    t.equal(p.previous, seed, 'utf-16 round trip')
    await mod.applyWindowsPath(p)
    t.equal((await mod.readUserPath({ key }))?.data, `${dir};${seed}`)
    t.equal(
      (await mod.planWindowsPath(dir, { key })).action,
      'unchanged',
    )

    // argv quoting: `"`, trailing `\` after a space, over 1024 chars
    const quoted = `"C:\\q r";C:\\${'l'.repeat(1100)};C:\\Program Files\\x\\`
    await reg(
      'add',
      key,
      '/v',
      'Path',
      '/t',
      'REG_EXPAND_SZ',
      '/d',
      quoted,
      '/f',
    )
    const q = await mod.planWindowsPath(dir, { key })
    t.equal(q.action, 'prepend')
    t.equal(q.previous, quoted, 'seed read back exact')
    await mod.applyWindowsPath(q)
    t.equal(
      (await mod.readUserPath({ key }))?.data,
      `${dir};${quoted}`,
    )
  },
)
