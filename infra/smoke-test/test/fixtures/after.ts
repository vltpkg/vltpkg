import t from 'tap'
import { rmSync } from 'node:fs'
import { Variants } from './variants.ts'

if (!t.saveFixture) {
  for (const variant of Object.values(Variants)) {
    if (variant.setup) {
      rmSync(variant.dir, { recursive: true, force: true })
    }
  }
}
