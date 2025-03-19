import { rmSync } from 'node:fs'
import { Variants } from './variants.ts'

for (const variant of Object.values(Variants)) {
  if (variant.setup) {
    rmSync(variant.dir, { recursive: true, force: true })
  }
  if (variant.default) {
    await variant.setup?.({ dir: variant.dir })
  }
}
