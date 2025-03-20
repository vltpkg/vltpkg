import { rmSync } from 'node:fs'
import { defaultVariants, Variants } from './variants.ts'

for (const variant of Object.values(Variants)) {
  if (variant.setup) {
    rmSync(variant.dir, { recursive: true, force: true })
  }
  if (defaultVariants.includes(variant.type)) {
    await variant.setup?.({ dir: variant.dir })
  }
}
