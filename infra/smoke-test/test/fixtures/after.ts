import { Artifacts } from './run.ts'

for (const artifact of Object.values(Artifacts)) {
  await artifact.cleanup?.()
}
