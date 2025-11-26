#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const COMMANDS = ['dev', 'build', 'serve', 'prepare'] as const
type Command = (typeof COMMANDS)[number]

const ENV_DEFAULTS = {
  VSR_PLATFORM: 'node',
  VSR_STORAGE: 'fs',
  VSR_DATABASE: 'sqlite',
  VSR_PACKUMENT_TTL: '1hr',
  VSR_MANIFEST_TTL: '24h',
  VSR_TARBALL_TTL: '1yr',
  VSR_TELEMETRY: 'false',
} as const

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    platform: { type: 'string' },
    storage: { type: 'string' },
    database: { type: 'string' },
    'packument-ttl': { type: 'string' },
    'manifest-ttl': { type: 'string' },
    'tarball-ttl': { type: 'string' },
    telemetry: { type: 'boolean' },
  },
})

const showHelp = () => {
  console.log(`
vsr - vlt registry server

Usage: vsr <command> [options]

Commands:
  dev      Start development server with hot reload
  build    Build for production
  serve    Serve the production build
  prepare  Prepare nitro for development

Options:
  -h, --help              Show this help message
  --platform <platform>   Platform (node, cloudflare, vercel) [default: node]
  --storage <storage>     Storage backend (fs, r2, s3) [default: fs]
  --database <database>   Database backend (neon, sqlite) [default: sqlite]
  --packument-ttl <ttl>   Packument cache TTL [default: 1hr]
  --manifest-ttl <ttl>    Manifest cache TTL [default: 24h]
  --tarball-ttl <ttl>     Tarball cache TTL [default: 1yr]
  --telemetry             Enable telemetry [default: false]

Environment Variables:
  VSR_PLATFORM, VSR_STORAGE, VSR_DATABASE, VSR_PACKUMENT_TTL,
  VSR_MANIFEST_TTL, VSR_TARBALL_TTL, VSR_TELEMETRY
`)
  process.exit(0)
}

if (values.help) {
  showHelp()
}

const command = positionals[0] as Command | undefined

if (!command || !COMMANDS.includes(command)) {
  console.error(
    `Error: Invalid command "${command ?? ''}". Use one of: ${COMMANDS.join(', ')}`,
  )
  console.error('Run "vsr --help" for usage information.')
  process.exit(1)
}

// Build environment with defaults, then env vars, then CLI flags
const env: Record<string, string> = {
  ...process.env,
  VSR_PLATFORM:
    values.platform ??
    process.env.VSR_PLATFORM ??
    ENV_DEFAULTS.VSR_PLATFORM,
  VSR_STORAGE:
    values.storage ??
    process.env.VSR_STORAGE ??
    ENV_DEFAULTS.VSR_STORAGE,
  VSR_DATABASE:
    values.database ??
    process.env.VSR_DATABASE ??
    ENV_DEFAULTS.VSR_DATABASE,
  VSR_PACKUMENT_TTL:
    values['packument-ttl'] ??
    process.env.VSR_PACKUMENT_TTL ??
    ENV_DEFAULTS.VSR_PACKUMENT_TTL,
  VSR_MANIFEST_TTL:
    values['manifest-ttl'] ??
    process.env.VSR_MANIFEST_TTL ??
    ENV_DEFAULTS.VSR_MANIFEST_TTL,
  VSR_TARBALL_TTL:
    values['tarball-ttl'] ??
    process.env.VSR_TARBALL_TTL ??
    ENV_DEFAULTS.VSR_TARBALL_TTL,
  VSR_TELEMETRY:
    values.telemetry !== undefined ?
      String(values.telemetry)
    : (process.env.VSR_TELEMETRY ?? ENV_DEFAULTS.VSR_TELEMETRY),
}

const isWindows = process.platform === 'win32'
const nitroBin = resolve(
  ROOT,
  'node_modules',
  '.bin',
  isWindows ? 'nitro.exe' : 'nitro',
)

const run = (cmd: string, args: string[]) => {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: isWindows,
  })

  child.on('close', code => {
    process.exit(code ?? 0)
  })

  child.on('error', err => {
    console.error(`Failed to start: ${err.message}`)
    process.exit(1)
  })
}

switch (command) {
  case 'dev':
    run(nitroBin, ['dev'])
    break
  case 'build':
    run(nitroBin, ['build'])
    break
  case 'prepare':
    run(nitroBin, ['prepare'])
    break
  case 'serve':
    run('node', [resolve(ROOT, '.output', 'server', 'index.mjs')])
    break
}
