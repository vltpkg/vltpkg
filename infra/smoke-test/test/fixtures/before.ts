import { Artifacts } from './variants.ts'

for (const artifact of Object.values(Artifacts)) {
  await artifact.prepare()
}
