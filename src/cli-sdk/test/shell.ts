import { homedir } from 'node:os'
import t from 'tap'
import {
  detectShell,
  posixPath,
  prettyPath,
  shellPathCommand,
  shellRcFile,
} from '../src/shell.ts'
import type { Shell } from '../src/shell.ts'

const linux = {
  platform: 'linux',
  home: '/home/me',
  env: {},
} as const
const win = {
  platform: 'win32',
  home: 'C:\\Users\\me',
  env: {},
} as const

t.test('prettyPath', async t => {
  t.test('posix', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(prettyPath('/home/me', '/home/me'), '~')
    t.equal(prettyPath('/home/me/a b/c', '/home/me'), '~/a b/c')
    t.equal(prettyPath('/home/me2/x', '/home/me'), '/home/me2/x')
    t.equal(prettyPath('/home/me\\x', '/home/me'), '/home/me\\x')
    t.equal(prettyPath('/x', ''), '/x')
    t.equal(prettyPath(`${homedir()}/x`), '~/x')
  })
  t.test('win32', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    t.equal(prettyPath('C:\\Users\\me\\x', 'C:\\Users\\me'), '~\\x')
    t.equal(prettyPath('C:\\Users\\me/x', 'C:\\Users\\me'), '~/x')
    t.equal(
      prettyPath('C:\\Users\\me2\\x', 'C:\\Users\\me'),
      'C:\\Users\\me2\\x',
    )
  })
  t.test('explicit platform', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(prettyPath('C:\\me\\x', 'C:\\me', true), '~\\x')
    t.equal(prettyPath('/me\\x', '/me', false), '/me\\x')
  })
})

t.test('detectShell', async t => {
  const cases: [string, Shell][] = [
    ['/bin/zsh', 'zsh'],
    ['/usr/bin/bash', 'bash'],
    ['/usr/local/bin/fish', 'fish'],
    ['/bin/dash', 'sh'],
    ['/bin/sh', 'sh'],
    ['/usr/bin/nu', 'nu'],
    ['/usr/bin/pwsh', 'pwsh'],
    ['/bin/tcsh', 'unknown'],
    ['/bin/toString', 'unknown'],
    ['C:\\Program Files\\Git\\usr\\bin\\BASH.exe', 'bash'],
    ['powershell.exe', 'pwsh'],
  ]
  for (const [SHELL, shell] of cases) {
    t.equal(detectShell({ SHELL }, 'linux'), shell, SHELL)
  }
  t.equal(detectShell({ SHELL: '/bin/zsh' }, 'win32'), 'zsh')
  t.equal(detectShell({}, 'linux'), 'unknown')
  t.equal(detectShell({}, 'win32'), 'cmd')
  t.equal(
    detectShell({ PSModulePath: 'C:\\a;C:\\b;' }, 'win32'),
    'cmd',
  )
  t.equal(
    detectShell({ PSModulePath: 'C:\\u;C:\\a;C:\\b' }, 'win32'),
    'pwsh',
  )

  t.test('defaults to process', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'env', { value: { SHELL: '/bin/fish' } })
    t.equal(detectShell(), 'fish')
  })
})

t.test('posixPath', async t => {
  t.equal(posixPath('/home/me/x', linux), '"$HOME/x"')
  t.equal(posixPath('/opt/x', linux), '"/opt/x"')
  t.equal(posixPath('/opt/a"$`\\b', linux), '"/opt/a\\"\\$\\`\\\\b"')
  t.equal(posixPath('C:\\Users\\me\\x y', win), '"$HOME/x y"')
  t.equal(posixPath('D:\\x', win), '"/d/x"')

  t.test('defaults to process', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(posixPath(`${homedir()}/x`), '"$HOME/x"')
  })
})

t.test('shellPathCommand', async t => {
  const mac = '/home/me/Library/Application Support/vlt/global/bin'
  for (const shell of ['bash', 'zsh', 'sh', 'unknown'] as const) {
    t.equal(
      shellPathCommand(shell, mac, linux),
      'export PATH="$HOME/Library/Application Support/vlt/global/bin:$PATH"',
      shell,
    )
  }
  t.equal(
    shellPathCommand('bash', '/opt/$x', linux),
    'export PATH="/opt/\\$x:$PATH"',
  )
  t.equal(
    shellPathCommand('bash', 'C:\\Users\\me\\bin', win),
    'export PATH="$HOME/bin:$PATH"',
  )
  t.equal(
    shellPathCommand('bash', 'D:\\x', win),
    'export PATH="/d/x:$PATH"',
  )

  t.equal(
    shellPathCommand('fish', mac, linux),
    'fish_add_path "$HOME/Library/Application Support/vlt/global/bin"',
  )
  t.equal(
    shellPathCommand('fish', '/opt/a"$`\\b', linux),
    'fish_add_path "/opt/a\\"\\$`\\\\b"',
  )

  t.equal(
    shellPathCommand('nu', mac, linux),
    `$env.PATH = ($env.PATH | prepend "${mac}")`,
  )
  t.equal(
    shellPathCommand('nu', 'C:\\a"b', win),
    '$env.PATH = ($env.PATH | prepend "C:\\\\a\\"b")',
  )

  t.equal(
    shellPathCommand('pwsh', 'C:\\Users\\me\\a b', win),
    '$env:PATH += ";$HOME\\a b"',
  )
  t.equal(
    shellPathCommand('pwsh', 'D:\\$x`', win),
    '$env:PATH += ";D:\\`$x``"',
  )
  t.equal(
    shellPathCommand('pwsh', '/home/me/"x', linux),
    '$env:PATH += ":$HOME/`"x"',
  )
  t.equal(
    shellPathCommand('pwsh', '/opt/x', linux),
    '$env:PATH += ":/opt/x"',
  )

  t.equal(
    shellPathCommand('cmd', 'C:\\Users\\me\\AppData\\x', win),
    'set "PATH=%PATH%;%USERPROFILE%\\AppData\\x"',
  )
  t.equal(
    shellPathCommand('cmd', 'D:\\x', win),
    'set "PATH=%PATH%;D:\\x"',
  )

  t.test('defaults to process', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(
      shellPathCommand('zsh', `${homedir()}/x`),
      'export PATH="$HOME/x:$PATH"',
    )
  })
})

t.test('shellRcFile', async t => {
  t.equal(shellRcFile('zsh', linux), '~/.zshrc')
  t.equal(
    shellRcFile('zsh', {
      ...linux,
      env: { ZDOTDIR: '/home/me/.zsh' },
    }),
    '~/.zsh/.zshrc',
  )
  t.equal(
    shellRcFile('zsh', { ...linux, env: { ZDOTDIR: '/etc/zsh' } }),
    '/etc/zsh/.zshrc',
  )
  t.equal(shellRcFile('bash', linux), '~/.bashrc')
  t.equal(shellRcFile('sh', linux), '~/.profile')
  t.equal(
    shellRcFile('sh', { ...linux, env: { ENV: '/home/me/.shrc' } }),
    '~/.shrc',
  )
  t.equal(shellRcFile('pwsh', win), '$PROFILE')
  t.equal(
    shellRcFile('zsh', {
      ...win,
      env: { ZDOTDIR: 'C:\\Users\\me\\z' },
    }),
    '~\\z/.zshrc',
    'win32 home boundary from opts',
  )
  for (const shell of ['fish', 'nu', 'cmd', 'unknown'] as const) {
    t.equal(shellRcFile(shell, linux), undefined, shell)
  }

  t.test('darwin bash', async t => {
    const mac = (home: string) =>
      ({ platform: 'darwin', home, env: {} }) as const
    t.equal(shellRcFile('bash', mac(t.testdir({}))), '~/.profile')
    t.equal(
      shellRcFile(
        'bash',
        mac(t.testdir({ '.bash_login': '', '.profile': '' })),
      ),
      '~/.bash_login',
    )
    t.equal(
      shellRcFile(
        'bash',
        mac(t.testdir({ '.bash_login': '', '.bash_profile': '' })),
      ),
      '~/.bash_profile',
    )
  })

  t.test('defaults to process', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'env', { value: {} })
    t.equal(shellRcFile('zsh'), '~/.zshrc')
  })
})
