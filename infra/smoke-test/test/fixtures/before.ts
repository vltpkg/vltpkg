import { bundle, compile } from '@vltpkg/infra-build'
import { BUNDLE_DIR, COMPILE_DIR } from './run.ts'

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
const bins = ['vlt'] as const
await bundle({ outdir: BUNDLE_DIR, bins })
await compile({ outdir: COMPILE_DIR, stdio: 'pipe', bins })
