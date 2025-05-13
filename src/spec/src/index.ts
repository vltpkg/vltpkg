import { homedir } from 'node:os'
import {
  isAbsolute,
  join,
  resolve,
  win32 as winPath,
} from 'node:path'
import { inspect } from 'node:util'
import type { InspectOptions } from 'node:util'
import {
  defaultRegistry,
  defaultRegistries,
  defaultGitHosts,
  defaultGitHostArchives,
  defaultScopeRegistries,
  defaultJsrRegistries,
  getOptions,
  gitHostWebsites,
  kCustomInspect,
  Spec as BrowserSpec,
} from './browser.ts'
import type { SpecLike } from './browser.ts'

export {
  defaultRegistry,
  defaultRegistries,
  defaultGitHosts,
  defaultGitHostArchives,
  defaultScopeRegistries,
  defaultJsrRegistries,
  getOptions,
  gitHostWebsites,
  kCustomInspect,
}
export * from './types.ts'

export class Spec extends BrowserSpec implements SpecLike<Spec> {
  [kCustomInspect](
    _depth?: number,
    options?: InspectOptions,
  ): string {
    const str = inspect(
      Object.fromEntries(
        Object.entries(this).filter(([k, v]) => {
          return k !== 'options' && v !== undefined
        }),
      ),
      options,
    )
    return `@vltpkg/spec.Spec ${str}`
  }
}

Spec.nodejsDependencies = {
  homedir,
  isAbsolute,
  join,
  resolve,
  winPath,
}
