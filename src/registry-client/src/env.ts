import proc from 'node:process'

const { Deno, Bun } = globalThis as typeof globalThis & {
  Deno: undefined | object
  Bun: undefined | object
}

const isObj = (v: unknown) => typeof v === 'object' && !!v

export const isDeno = isObj(Deno)
export const isBun = !isDeno && isObj(Bun)
// bun and deno also report 'node' in process.versions so its only
// node if it is not bun or deno
export const isNode = !isDeno && !isBun && 'node' in proc.versions

// All the runtimes put their versions into process.versions
export const bun = isBun ? proc.versions.bun : undefined
export const deno = isDeno ? proc.versions.deno : undefined
export const node = isNode ? proc.versions.node : undefined
