// get openapi schema
import { API } from './src/api.ts'
import wranglerJson from './wrangler.json' with { type: 'json' }
import packageJson from './package.json' with { type: 'json' }
import type { OriginConfig, CookieOptions, ApiDocsConfig } from './types.ts'

export const DEV_CONFIG = wranglerJson.dev

export const DAEMON_PORT: number = 3000

export const VERSION: string = packageJson.version

// how to handle packages requests
export const ORIGIN_CONFIG: OriginConfig = {
  default: 'local',
  upstreams: {
    local: {
      type: 'local',
      url: 'http://localhost:8787',
      allowPublish: true
    },
    vsr: {
      type: 'vsr',
      url: 'https://vsr.io'
    },
    npm: {
      type: 'npm',
      url: 'https://registry.npmjs.org'
    },
    jsr: {
      type: 'jsr',
      url: 'https://jsr.io'
    }
  }
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
  '*'  // Reserved for hash-based routes
]

// Backward compatibility - maintain old PROXY behavior
export const PROXY: boolean = Object.keys(ORIGIN_CONFIG.upstreams).length > 1
export const PROXY_URL: string | undefined = ORIGIN_CONFIG.upstreams[ORIGIN_CONFIG.default]?.url

// exposes a publically accessible docs endpoint
export const EXPOSE_DOCS: boolean = true

// the domain the registry is hosted on
export const DOMAIN: string = `http://localhost:${DEV_CONFIG.port}`
export const REDIRECT_URI: string = `${DOMAIN}/-/auth/callback`

// the time in seconds to cache the registry
export const REQUEST_TIMEOUT: number = 60 * 1000

// cookie options
export const COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
}

// the docs configuration for the API reference
export const API_DOCS: ApiDocsConfig = {
  metaData: {
    title: 'vlt serverless registry'
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
        token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      },
      basic: {
        username: 'user',
        password: 'pass'
      }
    }
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
    javascript: ['xhr', 'jquery']
  },
  spec: {
    content: API
  },
  customCss: `@import '${DOMAIN}/public/styles/styles.css';`
}
