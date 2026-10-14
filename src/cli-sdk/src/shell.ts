import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

export type Shell =
  'bash' | 'zsh' | 'fish' | 'sh' | 'nu' | 'pwsh' | 'cmd' | 'unknown'

export type ShellOptions = {
  env?: NodeJS.ProcessEnv
  platform?: NodeJS.Platform
  home?: string
}

const shells = new Map<string, Shell>([
  ['bash', 'bash'],
  ['zsh', 'zsh'],
  ['fish', 'fish'],
  ['nu', 'nu'],
  ['pwsh', 'pwsh'],
  ['powershell', 'pwsh'],
  ['sh', 'sh'],
  ['dash', 'sh'],
  ['ksh', 'sh'],
  ['mksh', 'sh'],
  ['ash', 'sh'],
])

const isSep = (c: string | undefined, win32: boolean) =>
  c === '/' || (win32 && c === '\\')

// rest of `path` after `home`: '' for home itself, undefined outside
const homeRest = (
  path: string,
  home: string,
  win32: boolean,
): string | undefined =>
  !home ? undefined
  : path === home ? ''
  : path.startsWith(home) && isSep(path[home.length], win32) ?
    path.slice(home.length)
  : undefined

/** `~/x` for a path under the home dir */
export const prettyPath = (
  path: string,
  home = homedir(),
  win32 = process.platform === 'win32',
): string => {
  const rest = homeRest(path, home, win32)
  return rest === undefined ? path : `~${rest}`
}

/** the user's shell, from `SHELL`, or a guess on win32 */
export const detectShell = (
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Shell => {
  const { SHELL } = env
  if (SHELL) {
    const name = SHELL.replace(/^.*[\\/]/, '')
      .replace(/\.exe$/i, '')
      .toLowerCase()
    return shells.get(name) ?? 'unknown'
  }
  if (platform !== 'win32') return 'unknown'
  // set machine-wide, PowerShell adds the user module dir
  const mods = (env.PSModulePath ?? '').split(';').filter(Boolean)
  return mods.length >= 3 ? 'pwsh' : 'cmd'
}

const opts = ({
  env = process.env,
  platform = process.platform,
  home = homedir(),
}: ShellOptions) => ({
  env,
  platform,
  home,
  win32: platform === 'win32',
})

const escape = (s: string, chars: RegExp, esc = '\\') =>
  s.replace(chars, c => esc + c)

// `$HOME/x`, or the path, `/c/x` style on win32
const posixInner = (dir: string, o: ShellOptions, chars: RegExp) => {
  const { home, win32 } = opts(o)
  const slash = (p: string) => (win32 ? p.replace(/\\/g, '/') : p)
  const rest = homeRest(dir, home, win32)
  if (rest !== undefined) return '$HOME' + escape(slash(rest), chars)
  const p =
    win32 ?
      slash(dir).replace(
        /^([a-z]):/i,
        (_, d: string) => `/${d.toLowerCase()}`,
      )
    : dir
  return escape(p, chars)
}

const shChars = /[\\"$`]/g

/** `dir` double-quoted for a POSIX shell, `$HOME` late-bound */
export const posixPath = (
  dir: string,
  o: ShellOptions = {},
): string => `"${posixInner(dir, o, shChars)}"`

/** `dir` double-quoted for fish, `$HOME` late-bound */
export const fishPath = (dir: string, o: ShellOptions = {}): string =>
  `"${posixInner(dir, o, /[\\"$]/g)}"`

/** the line that adds `dir` to the `PATH` in `shell` */
export const shellPathCommand = (
  shell: Shell,
  dir: string,
  o: ShellOptions = {},
): string => {
  const { home, win32 } = opts(o)
  const rest = homeRest(dir, home, win32)
  switch (shell) {
    case 'fish':
      return `fish_add_path ${fishPath(dir, o)}`
    case 'nu':
      return `$env.PATH = ($env.PATH | prepend "${escape(dir, /[\\"]/g)}")`
    case 'pwsh': {
      const p =
        rest === undefined ?
          escape(dir, /[`"$]/g, '`')
        : '$HOME' + escape(rest, /[`"$]/g, '`')
      return `$env:PATH += "${win32 ? ';' : ':'}${p}"`
    }
    case 'cmd':
      return `set "PATH=%PATH%;${rest === undefined ? dir : '%USERPROFILE%' + rest}"`
    default:
      return `export PATH="${posixInner(dir, o, shChars)}:$PATH"`
  }
}

/** rc file to add the `PATH` line to, for display */
export const shellRcFile = (
  shell: Shell,
  o: ShellOptions = {},
): string | undefined => {
  const { env, platform, home, win32 } = opts(o)
  switch (shell) {
    case 'zsh':
      return prettyPath(`${env.ZDOTDIR || home}/.zshrc`, home, win32)
    case 'bash': {
      const has = (f: string) => existsSync(`${home}/${f}`)
      // like `vlt setup --path`: never a new .bashrc
      if (platform !== 'darwin' && has('.bashrc')) return '~/.bashrc'
      // a new .bash_profile would shadow .profile
      const f = ['.bash_profile', '.bash_login'].find(has)
      return `~/${f ?? '.profile'}`
    }
    case 'sh':
      return env.ENV ? prettyPath(env.ENV, home, win32) : '~/.profile'
    case 'pwsh':
      return '$PROFILE'
    default:
      return undefined
  }
}
