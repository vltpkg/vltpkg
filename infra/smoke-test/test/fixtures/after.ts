import t from 'tap'
import { Variants } from './variants.ts'

if (!t.saveFixture) {
  for (const variant of Object.values(Variants)) {
    variant.cleanup?.()
  }
}
