import pkg from '@vltpkg/user-agent/package.json' with { type: 'json' }

// Read the runtime off of globalThis rather than importing `node:process`
// so that this stays usable from browser-safe packages.
const { navigator: nav, process: proc } = globalThis as unknown as {
  navigator?: { userAgent?: string }
  process?: { versions: Record<string, string | undefined> }
}

/* c8 ignore next - there is no `process` in a browser */
const versions = proc?.versions ?? {}

const isObj = (v: unknown) => typeof v === 'object' && !!v

const { Deno, Bun } = globalThis as typeof globalThis & {
  Deno: undefined | object
  Bun: undefined | object
}

const isDeno = isObj(Deno)
const isBun = !isDeno && isObj(Bun)
// bun and deno also report 'node' in process.versions so its only
// node if it is not bun or deno
const isNode = !isDeno && !isBun && 'node' in versions

// All the runtimes put their versions into process.versions
const bun = isBun ? versions.bun : undefined
const deno = isDeno ? versions.deno : undefined
const node = isNode ? versions.node : undefined

const runtime =
  nav?.userAgent ??
  (bun ? `Bun/${bun}`
  : deno ? `Deno/${deno}`
  : node ? `Node.js/${node}`
  : '(unknown platform)')

/**
 * The `User-Agent` header sent with every request vlt makes, and the value
 * of `npm_config_user_agent` in lifecycle script environments.
 *
 * Looks like `vlt/1.2.3 Node.js/22.22.0`, with the trailing portion coming
 * from `navigator.userAgent` when the runtime provides one.
 */
export const userAgent = `vlt/${pkg.version} ${runtime}`
