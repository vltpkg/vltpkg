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
import { DAEMON_PORT, DAEMON_URL } from '../../config.ts'
import { minArgs } from 'minargs'
import { load } from '@vltpkg/vlt-json'
import { createRequire } from 'node:module'

const usage = `USAGE:

  $ vsr [<command>] [<options>]
  
COMMANDS:

  dev                        Start development server (default)
  deploy                     Deploy to Cloudflare Workers
  
OPTIONS:                   DESCRIPTION:

--daemon=<boolean>         Run filesystem daemon (default: true)
--telemetry=<boolean>      Run with telemetry reporting (default: true)
-p, --port=<number>        Run on a specific port (default: ${DAEMON_PORT})
-H, --host=<string>        Bind address for dev server (default: localhost)
-c, --config=<path>        Load configuration from vlt.json file
-d, --debug                Run in debug mode
-h, --help                 Print usage information

DEPLOY OPTIONS:

--env=<string>             Environment to deploy to (dev, staging, prod)
--db-name=<string>         Override D1 database name
--bucket-name=<string>     Override R2 bucket name
--queue-name=<string>      Override queue name
--dry-run                  Show what would be deployed without deploying

EXAMPLES:

  $ vsr                               # Run dev server with all defaults
  $ vsr dev --port=3000 --debug       # Custom port with debug
  $ vsr deploy                        # Deploy to default environment
  $ vsr deploy --env=prod             # Deploy to production
  $ vsr deploy --dry-run              # Preview deployment
  $ vsr --config=/path/to/vlt.json    # Use specific config file
`

const defaults: Args = {
  daemon: true,
  telemetry: true,
  debug: false,
  help: false,
  port: 1337,
  host: 'localhost',
  config: undefined,
  env: undefined,
  'db-name': undefined,
  'bucket-name': undefined,
  'queue-name': undefined,
  'dry-run': false,
}

const opts = {
  alias: {
    p: 'port',
    H: 'host',
    c: 'config',
    d: 'debug',
    h: 'help',
  },
  boolean: ['debug', 'help', 'daemon', 'telemetry', 'dry-run'],
  string: [
    'port',
    'host',
    'config',
    'env',
    'db-name',
    'bucket-name',
    'queue-name',
  ],
  default: defaults,
  positionalValues: true, // Allow space-separated values like -p 3000
}

//  parse args
const { args, positionals } = minArgs(opts)

// Extract command (default to 'dev' if not specified)
const command = positionals[0] || 'dev'

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
    host?: string
    deploy?: {
      environments?: {
        [key: string]: DeployEnvironment
      }
      sentry?: {
        dsn?: string
        environment?: string
        sampleRate?: number
        tracesSampleRate?: number
      }
    }
  }
  daemon?: boolean
  telemetry?: boolean
  debug?: boolean
  port?: number
  host?: string
}

interface DeployEnvironment {
  databaseName?: string
  bucketName?: string
  queueName?: string
  vars?: Record<string, any>
  sentry?: {
    dsn?: string
    environment?: string
    sampleRate?: number
    tracesSampleRate?: number
  }
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
const HOST = getStringValue(
  args.host,
  registryConfig.host ?? vltConfig.host ?? defaults.host,
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

// Deploy-specific configuration
const ENV = getStringValue(args.env, 'dev')
const DRY_RUN = getBooleanValue(
  args['dry-run'],
  defaults['dry-run'] ?? false,
)
const DB_NAME_OVERRIDE = getStringValue(args['db-name'])
const BUCKET_NAME_OVERRIDE = getStringValue(args['bucket-name'])
const QUEUE_NAME_OVERRIDE = getStringValue(args['queue-name'])

// Print usage information
function printUsage(): void {
  // eslint-disable-next-line no-console
  console.log(usage)
}

// Deploy function
async function deployToCloudflare(): Promise<void> {
  const deployConfig = registryConfig.deploy
  const envConfig = deployConfig?.environments?.[ENV ?? 'dev'] ?? {}

  // Determine resource names with precedence: CLI args > env config > defaults
  const databaseName =
    DB_NAME_OVERRIDE ?? envConfig.databaseName ?? 'vsr-database'
  const bucketName =
    BUCKET_NAME_OVERRIDE ?? envConfig.bucketName ?? 'vsr-bucket'
  const queueName =
    QUEUE_NAME_OVERRIDE ??
    envConfig.queueName ??
    'cache-refresh-queue'

  // Build Sentry configuration
  const sentryConfig = envConfig.sentry ?? deployConfig?.sentry ?? {}
  const sentryDsn =
    sentryConfig.dsn ??
    'https://909b085eb764c00250ad312660c2fdf1@o4506397716054016.ingest.us.sentry.io/4509492612300800'
  const sentryEnv = sentryConfig.environment ?? ENV

  // Build wrangler deploy arguments
  const wranglerArgs = [
    'deploy',
    indexPath,
    '--config',
    wranglerConfigPath,
    '--name',
    `vsr-${ENV}`,
    '--compatibility-date',
    '2024-09-23',
    '--var',
    `SENTRY_DSN:${sentryDsn}`,
    '--var',
    `SENTRY_ENVIRONMENT:${sentryEnv}`,
    '--var',
    `ARG_DEBUG:${DEBUG}`,
    '--var',
    `ARG_TELEMETRY:${TELEMETRY}`,
    '--var',
    `ARG_DAEMON:${DAEMON}`,
  ]

  // Add D1 database binding
  wranglerArgs.push('--d1', `DB=${databaseName}`)

  // Add R2 bucket binding
  wranglerArgs.push('--r2', `BUCKET=${bucketName}`)

  // Add queue bindings
  wranglerArgs.push(
    '--queue-producer',
    `CACHE_REFRESH_QUEUE=${queueName}`,
  )
  wranglerArgs.push('--queue-consumer', queueName)

  // Add custom environment variables from config
  if (envConfig.vars) {
    for (const [key, value] of Object.entries(envConfig.vars)) {
      wranglerArgs.push('--var', `${key}:${value}`)
    }
  }

  if (DRY_RUN) {
    wranglerArgs.push('--dry-run')
    // eslint-disable-next-line no-console
    console.log(
      '🔍 Dry run - would execute:',
      wranglerBin,
      wranglerArgs.join(' '),
    )
    // eslint-disable-next-line no-console
    console.log('\n📋 Deployment configuration:')
    // eslint-disable-next-line no-console
    console.log(`  Environment: ${ENV}`)
    // eslint-disable-next-line no-console
    console.log(`  Database: ${databaseName}`)
    // eslint-disable-next-line no-console
    console.log(`  Bucket: ${bucketName}`)
    // eslint-disable-next-line no-console
    console.log(`  Queue: ${queueName}`)
    // eslint-disable-next-line no-console
    console.log(`  Sentry DSN: ${sentryDsn}`)
    // eslint-disable-next-line no-console
    console.log(`  Sentry Environment: ${sentryEnv}`)
    return
  }

  // eslint-disable-next-line no-console
  console.log(`🚀 Deploying VSR to ${ENV} environment...`)

  return new Promise((resolve, reject) => {
    const deployProcess = spawn(wranglerBin, wranglerArgs, {
      cwd: registryRoot,
      stdio: 'inherit',
    })

    deployProcess.on('close', code => {
      if (code === 0) {
        // eslint-disable-next-line no-console
        console.log(`✅ Successfully deployed VSR to ${ENV}`)
        resolve()
      } else {
        reject(new Error(`Deployment failed with exit code ${code}`))
      }
    })

    deployProcess.on('error', error => {
      reject(
        new Error(`Failed to start deployment: ${error.message}`),
      )
    })
  })
}

// Check if the help flag was passed
if (args.help) {
  printUsage()
  process.exit(0)
}

// Validate command
if (!['dev', 'deploy'].includes(command)) {
  // eslint-disable-next-line no-console
  console.error(`❌ Unknown command: ${command}`)
  printUsage()
  process.exit(1)
}

// TODO: Remove the demo/dummy project once server doesn't need one
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const demo = path.resolve(__dirname, './demo')
const require = createRequire(import.meta.url)

// Resolve paths relative to this script's location
const registryRoot = path.resolve(__dirname, '../../')
const indexPath = path.resolve(registryRoot, 'dist/index.js')
const wranglerConfigPath = path.resolve(registryRoot, 'wrangler.json')

// Find the wrangler binary from node_modules
const wranglerPkgPath = require.resolve('wrangler/package.json')
const wranglerRelBinPath = (
  JSON.parse(readFileSync(wranglerPkgPath, 'utf8')) as {
    bin: { wrangler: string }
  }
).bin.wrangler
const wranglerBinPath = require.resolve(
  path.join('wrangler', wranglerRelBinPath),
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
    if (command === 'deploy') {
      await deployToCloudflare()
      return
    }

    // Default 'dev' command
    if (DAEMON) {
      // Save original process.argv to restore later
      const originalArgv = process.argv.slice()

      // Temporarily modify process.argv to remove VSR-specific flags that daemon doesn't understand
      // Keep only the basic node command and script path
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.argv = [process.argv[0]!, process.argv[1]!]

      try {
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
      } finally {
        // Restore original process.argv
        process.argv = originalArgv
      }
    }

    // eslint-disable-next-line no-console
    console.log(`VSR: http://${HOST}:${PORT}`)

    // spawn the wrangler dev process with resolved paths
    const { stdout, stderr } = spawn(
      wranglerBin,
      [
        'dev',
        indexPath,
        '--config',
        wranglerConfigPath,
        '--local',
        '--persist-to=local-store',
        '--no-remote',
        `--port=${PORT}`,
        `--ip=${HOST}`,
        `--var=ARG_HOST:${HOST}`,
        `--var=ARG_PORT:${PORT}`,
        `--var=ARG_URL:http://${HOST}:${PORT}`,
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
    console.error('Failed to start:', error)
    process.exit(1)
  }
})()
