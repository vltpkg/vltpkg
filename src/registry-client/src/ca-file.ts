import { error } from '@vltpkg/error-cause'
import { readFileSync } from 'node:fs'
import proc from 'node:process'
import * as tls from 'node:tls'

const pemCertificate =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g

// The contents of the file that was last applied on this thread, so
// that building several clients only parses the bundle once. The file
// is still read every time, so a bundle replaced at the same path is
// picked up and a removed one is an error.
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
  if (!path) return undefined

  let pem: string
  try {
    pem = readFileSync(path, 'utf8')
  } catch (cause) {
    throw error('Could not read the CA file in NPM_CONFIG_CAFILE', {
      path,
      cause,
    })
  }

  if (pem === applied) return path

  const certs = pem.match(pemCertificate)
  if (!certs) {
    throw error(
      'The CA file in NPM_CONFIG_CAFILE contains no PEM certificates',
      { path },
    )
  }

  // The setter is missing from some node versions that vlt supports. It
  // is looked up here and not imported by name, so that those versions
  // only fail when the variable is actually set.
  const { setDefaultCACertificates } = tls as Partial<typeof tls>
  if (!setDefaultCACertificates) {
    throw error('NPM_CONFIG_CAFILE is not supported by this node', {
      found: proc.version,
      wanted: '^22.19.0 || >=24.5.0',
    })
  }

  setDefaultCACertificates(certs)
  applied = pem
  return path
}
