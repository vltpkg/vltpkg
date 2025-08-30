// get openapi schema
import wranglerJson from './wrangler.json' with { type: 'json' }
import packageJson from './package.json' with { type: 'json' }
import { apiBody } from './src/utils/docs.ts'
import type {
  OriginConfig,
  CookieOptions,
  ApiDocsConfig,
} from './types.ts'

export const YEAR = new Date().getFullYear()

export const WRANGLER_CONFIG = wranglerJson.dev

export const PORT = WRANGLER_CONFIG.port || (1337 as number)

export const TELEMETRY_ENABLED = true as boolean

export const HELP_ENABLED = false as boolean

export const DEBUG_ENABLED = false as boolean

export const API_DOCS_ENABLED = true as boolean

export const DAEMON_ENABLED = true as boolean

export const DAEMON_PORT = 3000 as number

export const DAEMON_URL = `http://localhost:${DAEMON_PORT}`

export const VERSION: string = packageJson.version

export const URL = `http://localhost:${PORT}`

export const REDIRECT_URI = `${URL}/-/auth/callback`

// how to handle packages requests
export const ORIGIN_CONFIG: OriginConfig = {
  default: 'local',
  upstreams: {
    local: {
      type: 'local',
      url: URL,
      allowPublish: true,
    },
    npm: {
      type: 'npm',
      url: 'https://registry.npmjs.org',
    },
  },
}

// Reserved route prefixes that cannot be used as upstream names
export const RESERVED_ROUTES: string[] = [
  '-',
  'user',
  'docs',
  'search',
  'tokens',
  'auth',
  'ping',
  'package',
  'v1',
  'api',
  'admin',
  '*', // Reserved for hash-based routes
]

// Backward compatibility - maintain old PROXY behavior
export const PROXY: boolean =
  Object.keys(ORIGIN_CONFIG.upstreams).length > 1

export const PROXY_URL: string | undefined =
  ORIGIN_CONFIG.upstreams[ORIGIN_CONFIG.default]?.url

// the time in seconds to cache the registry
export const REQUEST_TIMEOUT: number = 60 * 1000

// cookie options
export const COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
}

// OpenAPI Docs
export const OPEN_API_CONFIG = {
  openapi: '3.1.0',
  info: {
    title: 'vlt serverless registry',
    version: VERSION,
    description: 'The vlt serverless registry API',
  },
}

// the docs configuration for the API reference
export const SCALAR_API_CONFIG: ApiDocsConfig = {
  metaData: {
    title: 'vlt serverless registry',
  },
  hideModels: false,
  hideDownloadButton: false,
  darkMode: false,
  favicon: '/public/images/favicon/favicon.svg',
  defaultHttpClient: {
    targetKey: 'curl',
    clientKey: 'fetch',
  },
  authentication: {
    http: {
      bearer: {
        token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      basic: {
        username: 'user',
        password: 'pass',
      },
    },
  },
  hiddenClients: {
    python: true,
    c: true,
    go: true,
    java: true,
    ruby: true,
    shell: ['httpie', 'wget', 'fetch'],
    clojure: true,
    csharp: true,
    kotlin: true,
    objc: true,
    swift: true,
    r: true,
    powershell: false,
    ocaml: true,
    curl: false,
    http: true,
    php: true,
    node: ['request', 'unirest'],
    javascript: ['xhr', 'jquery'],
  },
  spec: {
    content: {
      openapi: OPEN_API_CONFIG.openapi,
      servers: [
        {
          url: URL,
          description: 'localhost',
        },
      ],
      info: {
        title: 'vlt serverless registry',
        version: VERSION,
        license: {
          identifier: 'FSL-1.1-MIT',
          name: 'Functional Source License, Version 1.1, MIT Future License',
          url: 'https://fsl.software/FSL-1.1-MIT.template.md',
        },
        description: apiBody({ YEAR }),
      },
    },
  },
  customCss: `@import '${URL}/public/styles/styles.css';`,
}
