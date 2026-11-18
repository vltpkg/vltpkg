import { error } from '@vltpkg/error-cause'
import { readFileSync } from 'node:fs'
import proc from 'node:process'
import { setDefaultCACertificates } from 'node:tls'

const pemCertificate =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g

// The file that was last applied on this thread, so that building
// several clients only reads and parses the bundle once.
let applied: string | undefined

// The name is the one other package managers read for their `cafile`
// setting. An empty string counts as unset.
const caFileEnv = () => proc.env.NPM_CONFIG_CAFILE || undefined

/**
 * Replace node's default certificate authorities with the PEM bundle
 * named by `NPM_CONFIG_CAFILE`, when it is set.
 *
 * This is an override, not an addition: once applied, only the
 * certificates in the file are trusted, and the CAs bundled with node
 * or found in the system store are not. It changes the default for
 * every TLS connection made on the current thread that does not pass
 * its own `ca`, which covers the registry dispatcher (direct or through
 * a proxy) as well as the global `fetch`.
 *
 * Returns the path that is in effect, or `undefined` when the variable
 * is not set and the defaults are left alone.
 */
export const applyCAFile = (): string | undefined => {
  const path = caFileEnv()
  if (!path || path === applied) return path

  let pem: string
  try {
    pem = readFileSync(path, 'utf8')
  } catch (cause) {
    throw error('Could not read the CA file in NPM_CONFIG_CAFILE', {
      path,
      cause,
    })
  }

  const certs = pem.match(pemCertificate)
  if (!certs) {
    throw error(
      'The CA file in NPM_CONFIG_CAFILE contains no PEM certificates',
      { path },
    )
  }

  setDefaultCACertificates(certs)
  applied = path
  return path
}
