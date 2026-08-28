import { homedir } from 'node:os'
import {
  isAbsolute,
  join,
  resolve,
  win32 as winPath,
} from 'node:path'
import { inspect } from 'node:util'
import type { InspectOptions } from 'node:util'
import type { SpecLike } from './browser.ts'
import { Spec as BrowserSpec, kCustomInspect } from './browser.ts'

// eslint-disable-next-line import/export
export * from './browser.ts'

// eslint-disable-next-line import/export
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

// Republish the inspect hook under `inspect.custom`. Only that spelling is
// honoured by the compiler (perry-notes F7), and browser.ts must keep
// `Symbol.for('nodejs.util.inspect.custom')` because non-node hosts have no
// `node:util`. Under Node the two are the same symbol and this is a no-op.
/* c8 ignore start */
if ((inspect.custom as symbol) !== (kCustomInspect as symbol)) {
  Object.defineProperty(Spec.prototype, inspect.custom, {
    value: Spec.prototype[kCustomInspect],
    writable: true,
    configurable: true,
  })
}
/* c8 ignore stop */

Spec.nodejsDependencies = {
  homedir,
  isAbsolute,
  join,
  resolve,
  winPath,
}
