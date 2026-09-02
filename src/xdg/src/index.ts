import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'

// `$HOME` first: compiled, `homedir()` answers `/`, which would put every
// vlt config, cache and data dir at the filesystem root
const root = process.env.HOME || homedir()
const path = (p: string) => resolve(root, p)

/**
 * Directory to treat as the user's home for walk-up stops and project
 * discovery. Compiled, `os.homedir()` is `/`; `$HOME` is the real home.
 * When `homedir()` is not `/`, keep it so tests can mock `os.homedir`.
 */
export const userHome = (home = homedir()): string =>
  home === '/' && process.env.HOME ? process.env.HOME : home

export type PathType =
  'cache' | 'config' | 'data' | 'runtime' | 'state'

const defaults =
  process.platform === 'darwin' ?
    (which: PathType): string => {
      switch (which) {
        case 'config':
          return path('Library/Preferences')
        case 'cache':
          return path('Library/Caches')
        case 'data':
          return path('Library/Application Support')
        case 'state':
          return path('Library/State')
        case 'runtime':
          return resolve(
            tmpdir(),
            /* c8 ignore next */
            String(process.getuid?.() ?? ''),
            '.run',
          )
      }
    }
  : process.platform === 'win32' ?
    (which: PathType): string => {
      const ad = process.env.APPDATA ?? path('AppData/Roaming')
      const lad = process.env.LOCALAPPDATA ?? path('AppData/Local')
      switch (which) {
        case 'config':
          return resolve(ad, 'xdg.config')
        case 'cache':
          return resolve(lad, 'xdg.cache')
        case 'data':
          return resolve(ad, 'xdg.data')
        case 'state':
          return resolve(lad, 'xdg.state')
        case 'runtime':
          return resolve(tmpdir(), 'xdg.run')
      }
    }
  : (which: PathType): string => {
      switch (which) {
        case 'config':
          return path('.config')
        case 'cache':
          return path('.cache')
        case 'data':
          return path('.local/share')
        case 'state':
          return path('.local/state')
        case 'runtime':
          return resolve(
            tmpdir(),
            /* c8 ignore next */
            String(process.getuid?.() ?? ''),
            '.run',
          )
      }
    }

const {
  XDG_CONFIG_HOME = defaults('config'),
  XDG_CACHE_HOME = defaults('cache'),
  XDG_DATA_HOME = defaults('data'),
  XDG_STATE_HOME = defaults('state'),
  XDG_RUNTIME_DIR = defaults('runtime'),
} = process.env

export class XDG {
  name: string
  base: { [k in PathType]: string } = {
    config: XDG_CONFIG_HOME,
    cache: XDG_CACHE_HOME,
    data: XDG_DATA_HOME,
    state: XDG_STATE_HOME,
    runtime: XDG_RUNTIME_DIR,
  }
  constructor(name: string) {
    this.name = name
  }
  config(p = '') {
    return resolve(this.base.config, this.name, p)
  }
  cache(p = '') {
    return resolve(this.base.cache, this.name, p)
  }
  data(p = '') {
    return resolve(this.base.data, this.name, p)
  }
  state(p = '') {
    return resolve(this.base.state, this.name, p)
  }
  runtime(p = '') {
    return resolve(this.base.runtime, this.name, p)
  }
}
