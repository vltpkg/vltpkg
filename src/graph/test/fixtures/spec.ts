export * from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'

Object.assign(Spec.prototype, {
  [Symbol.for('nodejs.util.inspect.custom')]() {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return `Spec {${this}}`
  },
})
