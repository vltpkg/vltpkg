#!/usr/bin/env NODE_OPTIONS=--no-warnings node
import type { Args } from '../../types.ts'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { PackageInfoClient } from '@vltpkg/package-info'
import { createServer } from '@vltpkg/server'
import { existsSync, readFileSync } from 'node:fs'
import type { VltServerOptions } from '@vltpkg/server'
import {
  DAEMON_PORT,
  DAEMON_URL,
  URL,
  WRANGLER_CONFIG,
} from '../../config.ts'
import { minArgs } from 'minargs'
import { load } from '@vltpkg/vlt-json'

const usage = `USAGE:

  $ vsr [<options>]
  
OPTIONS:                   DESCRIPTION:

--daemon=<boolean>         Run filesystem daemon (default: true)
--telemetry=<boolean>      Run with telemetry reporting (default: true)
-p, --port=<number>        Run on a specific port (default: ${DAEMON_PORT})
-c, --config=<path>        Load configuration from vlt.json file
-d, --debug                Run in debug mode
-h, --help                 Print usage information

EXAMPLES:

  $ vsr                               # Run with all defaults
  $ vsr --port=3000 --debug           # Custom port with debug
  $ vsr -p 4000 --daemon=false        # Port via alias, disable daemon
  $ vsr -d --telemetry=false          # Debug mode, no telemetry
  $ vsr --config=/path/to/vlt.json    # Use specific config file
  $ vsr -c ./custom-vlt.json          # Use config file via alias
`

const defaults: Args = {
  daemon: true,
  telemetry: true,
  debug: false,
  help: false,
  port: WRANGLER_CONFIG.port,
  config: undefined,
}

const opts = {
  alias: {
    p: 'port',
    c: 'config',
    d: 'debug',
    h: 'help',
  },
  boolean: ['debug', 'help', 'daemon', 'telemetry'],
  string: ['port', 'config'],
  default: defaults,
  positionalValues: true, // Allow space-separated values like -p 3000
}

//  parse args
const { args } = minArgs(opts)

// Helper functions to extract values from minArgs array format
function getBooleanValue(
  arg: string[] | undefined,
  defaultValue: boolean,
): boolean {
  if (!arg || arg.length === 0) return defaultValue
  const value = arg[0]
  if (value === '' || value === undefined) return true // flag present without value
  return value !== 'false' && value !== '0'
}

function getStringValue(
  arg: string[] | undefined,
  defaultValue?: string,
): string | undefined {
  if (!arg || arg.length === 0) return defaultValue
  return arg[0] || defaultValue
}

function getNumberValue(
  arg: string[] | undefined,
  defaultValue: number,
): number {
  if (!arg || arg.length === 0) return defaultValue
  const value = arg[0]
  return Number(value) || defaultValue
}

// Type definition for VSR config in vlt.json
interface VsrConfig {
  registry?: {
    daemon?: boolean
    telemetry?: boolean
    debug?: boolean
    port?: number
  }
  daemon?: boolean
  telemetry?: boolean
  debug?: boolean
  port?: number
}

// Load configuration from vlt.json
function loadVltConfig(configPath?: string): VsrConfig {
  try {
    const isVsrConfig = (
      x: unknown,
      _file: string,
    ): asserts x is VsrConfig => {
      if (x === null || typeof x !== 'object') {
        throw new Error('Config must be an object')
      }
    }

    let configData: VsrConfig | undefined

    if (configPath) {
      // Custom config path specified
      if (!existsSync(configPath)) {
        // eslint-disable-next-line no-console
        console.warn(`Config file not found: ${configPath}`)
        return {}
      }

      // For custom paths, we need to read the file manually
      const configContent = readFileSync(configPath, 'utf8')
      try {
        configData = JSON.parse(configContent) as VsrConfig
      } catch (_err) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to parse config file ${configPath}`)
        return {}
      }
    } else {
      // Use vlt-json to find and load project config
      try {
        configData = load('config', isVsrConfig)
      } catch (_err) {
        configData = undefined
      }
    }

    return configData ?? {}
  } catch (_err) {
    // Can't access DEBUG here since it hasn't been defined yet
    return {}
  }
}

// Get the config path from CLI args
const configPath = getStringValue(args.config)

// Load config and merge with CLI args (CLI args take precedence)
const vltConfig = loadVltConfig(configPath)
const registryConfig = vltConfig.registry ?? {}

// Extract parsed args with config fallbacks, CLI args take precedence
const PORT = getNumberValue(
  args.port,
  registryConfig.port ?? vltConfig.port ?? defaults.port,
)
const TELEMETRY = getBooleanValue(
  args.telemetry,
  registryConfig.telemetry ??
    vltConfig.telemetry ??
    defaults.telemetry,
)
const DAEMON = getBooleanValue(
  args.daemon,
  registryConfig.daemon ?? vltConfig.daemon ?? defaults.daemon,
)
const DEBUG = getBooleanValue(
  args.debug,
  registryConfig.debug ?? vltConfig.debug ?? defaults.debug,
)

// Print usage information
function printUsage(): void {
  // eslint-disable-next-line no-console
  console.log(usage)
}

// Check if the help flag was passed
if (args.help) {
  printUsage()
  process.exit(0)
}

// TODO: Remove the demo/dummy project once server doesn't need one
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const demo = path.resolve(__dirname, './demo')

// Resolve paths relative to this script's location
const registryRoot = path.resolve(__dirname, '../../')
const indexPath = path.resolve(registryRoot, 'dist/index.js')

// Find the wrangler binary from node_modules
const wranglerBinPath = path.resolve(
  registryRoot,
  'node_modules/.bin/wrangler',
)
const wranglerBin =
  existsSync(wranglerBinPath) ? wranglerBinPath : 'wrangler'

const serverOptions = {
  scurry: new PathScurry(demo),
  projectRoot: demo,
  packageJson: new PackageJson(),
  catalog: {},
  catalogs: {},
  registry: 'https://registry.npmjs.org/',
  registries: {},
  'scope-registries': {},
  'git-hosts': {},
  'git-host-archives': {},
} as VltServerOptions

void (async () => {
  try {
    if (DAEMON) {
      const server = createServer({
        ...serverOptions,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        packageInfo: new PackageInfoClient() as any,
      })

      await server.start({
        port: DAEMON_PORT,
      })

      // eslint-disable-next-line no-console
      console.log(`Daemon: ${DAEMON_URL}`)
    }

    // eslint-disable-next-line no-console
    console.log(`VSR: ${URL}`)

    // spawn the wrangler dev process with resolved paths
    const { stdout, stderr } = spawn(
      wranglerBin,
      [
        'dev',
        indexPath,
        '--local',
        '--persist-to=local-store',
        '--no-remote',
        `--port=${PORT}`,
        `--var=ARG_DEBUG:${DEBUG}`,
        `--var=ARG_TELEMETRY:${TELEMETRY}`,
        `--var=ARG_DAEMON:${DAEMON}`,
      ],
      {
        cwd: registryRoot, // Set working directory to registry root
      },
    )

    if (DEBUG) {
      stdout.on('data', (data: Buffer) => {
        // eslint-disable-next-line no-console
        console.log(data.toString())
      })
      stderr.on('data', (data: Buffer) => {
        // eslint-disable-next-line no-console
        console.error(data.toString())
      })
    }
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error)
    process.exit(1)
  }
})()
