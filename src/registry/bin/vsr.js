#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { createServer } from '@vltpkg/server'
import { SecurityArchive } from '@vltpkg/security-archive'
import packageJson from '../package.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const cwd = path.resolve(__dirname, '../')

const server = createServer({
  scurry: new PathScurry(cwd),
  projectRoot: cwd,
  packageJson: new PackageJson(),
  securityArchive: new SecurityArchive(),
  port: 3000
})

await server.start({
  port: 3000
})

console.log(`Listening on ${server.address()}`)
execSync(packageJson.scripts['serve:dev'], { cwd, stdio: 'inherit' })
