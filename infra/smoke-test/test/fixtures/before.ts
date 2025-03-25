import { Variants } from './variants.ts'

for (const variant of Object.values(Variants)) {
  variant.cleanup?.()
  await variant.setup?.()
}
