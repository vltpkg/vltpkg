export * from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'

// Create smaller snapshots for specs in these tests
Object.assign(Spec.prototype, {
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Spec {${(this as unknown as Spec).spec}}`
  },
})
