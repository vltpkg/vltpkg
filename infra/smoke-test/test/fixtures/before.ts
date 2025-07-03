import { Artifacts, allVariants } from './run.ts'

// Only prepare artifacts for variants that are actually being tested
const neededArtifacts = new Set<string>()

for (const variant of allVariants) {
  switch (variant) {
    case 'Node':
      neededArtifacts.add('Node')
      break
    case 'Bundle':
      neededArtifacts.add('Bundle')
      break
    case 'Compile':
      neededArtifacts.add('Compile')
      break
    case 'Deno':
      neededArtifacts.add('Node') // Deno variant uses Node artifacts but with Deno runtime
      break
    case 'DenoBundle':
      neededArtifacts.add('Bundle') // DenoBundle uses Bundle artifacts but with Deno runtime
      break
  }
}

for (const [name, artifact] of Object.entries(Artifacts)) {
  if (neededArtifacts.has(name)) {
    await artifact.prepare?.()
  }
}
