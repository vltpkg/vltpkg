import { rmSync } from 'node:fs'
import { BUNDLE_DIR, COMPILE_DIR } from './run.ts'

rmSync(BUNDLE_DIR, { recursive: true, force: true })
rmSync(COMPILE_DIR, { recursive: true, force: true })
