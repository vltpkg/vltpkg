import { error } from '@vltpkg/error-cause'
import { readFileSync } from 'node:fs'
import proc from 'node:process'
import { createSecureContext } from 'node:tls'
import type { SecureContext } from 'node:tls'

const pemCertificate =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g

// The last file contents turned into a context. The dispatchers a client
// builds for each `connectTimeout` share it, so the bundle is parsed
// once. The file is still read every time, so a bundle replaced at the
// same path is picked up and a removed one is an error.
let cached: { pem: string; context: SecureContext } | undefined

/**
 * The variable npm reads for its `cafile` setting, and its value. npm
 * matches `npm_config_*` names in any case and exports the lowercase
 * spelling to scripts, so that one is read first. An empty value counts
 * as unset.
 */
const caFileEnv = (): { name: string; path: string } | undefined => {
  for (const name of ['npm_config_cafile', 'NPM_CONFIG_CAFILE']) {
    const path = proc.env[name]
    if (path) return { name, path }
  }
  return undefined
}

/**
 * A TLS context that trusts only the certificates in the PEM bundle
 * named by `npm_config_cafile`, or `undefined` when it is not set.
 *
 * The registry dispatcher gives it to its connections in place of
 * node's default certificate authorities, as npm does with `cafile`.
 * Node's defaults, and every other TLS connection in the process, are
 * left alone.
 */
export const caSecureContext = (): SecureContext | undefined => {
  const env = caFileEnv()
  if (!env) return undefined
  const { name, path } = env

  let pem: string
  try {
    pem = readFileSync(path, 'utf8')
  } catch (cause) {
    throw error(`Could not read the CA file in ${name}`, {
      code: 'ECONFIG',
      found: path,
      cause,
    })
  }

  if (cached?.pem === pem) return cached.context

  const certs = pem.match(pemCertificate)
  if (!certs) {
    throw error(
      `The CA file in ${name} contains no PEM certificates`,
      {
        code: 'ECONFIG',
        found: path,
      },
    )
  }

  const context = createSecureContext({ ca: certs })
  cached = { pem, context }
  return context
}
