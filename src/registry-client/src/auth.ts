import { Keychain } from '@vltpkg/keychain'

export type Token = `Bearer ${string}` | `Basic ${string}`

// just exported for testing
export const kc = new Keychain<Token>('vlt/auth')

export const isToken = (t: any): t is Token =>
  typeof t === 'string' &&
  (t.startsWith('Bearer ') || t.startsWith('Basic '))

export const deleteToken = async (
  registry: string,
): Promise<void> => {
  await kc.load()
  kc.delete(new URL(registry).origin)
  await kc.save()
}

export const setToken = async (
  registry: string,
  token: Token,
): Promise<void> => {
  return kc.set(new URL(registry).origin, token)
}

export const getToken = async (
  registry: string,
): Promise<Token | undefined> => {
  registry = new URL(registry).origin
  const envReg = process.env.VLT_REGISTRY
  if (envReg && registry === new URL(envReg).origin) {
    const envTok = process.env.VLT_TOKEN
    if (envTok) return `Bearer ${envTok}`
  }
  const tok =
    process.env[
      `VLT_TOKEN_${registry.replace(/[^a-zA-Z0-9]+/g, '_')}`
    ]
  if (tok) return `Bearer ${tok}`
  return kc.get(registry)
}
