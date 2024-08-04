# `@vltpkg/rollback-remove`

A utility for removing stuff, in such a way that the removal
can be rolled back on failure, or confirmed and executed in a
detached background process.

## USAGE

The best way to use this is to _not_ catch errors, but detect
failure in a `finally` block and either confirm or roll back
appropriately.

```js
import { RollbackRemove } from '@vltpkg/rollback-remove'

const remover = new RollbackRemove()

let success = false
try {
  await remover.rm('some/path')
  doSomethingThatMayThrow()
  remover.confirm()
  success = true
} finally {
  if (!success) await remover.rollback()
}
```
