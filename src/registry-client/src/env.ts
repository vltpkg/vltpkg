export type GlobalEnv = {
  process:
    | undefined
    | { version: string; versions: Record<string, string> }
  Deno: undefined | { version: { deno: string; v8: string } }
  Bun: undefined | { version: string }
}

const {
  Deno,
  Bun,
  process: proc,
} = globalThis as unknown as GlobalEnv

const isObj = (v: unknown) => typeof v === 'object' && !!v

export const isDeno = isObj(Deno)
export const isBun = !isDeno && isObj(Bun)
export const isNode = !isDeno && !isBun && isObj(proc?.versions)

export const bun = isBun ? Bun?.version : undefined
export const deno = isDeno ? Deno?.version.deno : undefined
export const node = isNode ? proc?.version : undefined

export const engineVersion =
  isNode ? proc?.versions.v8
  : isDeno ? Deno?.version.v8
  : isBun ? bun
  : undefined

export const engineName =
  isNode || isDeno ? 'v8'
  : isBun ? 'bun'
  : undefined
