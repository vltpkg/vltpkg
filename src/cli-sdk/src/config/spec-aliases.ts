import { error } from '@vltpkg/error-cause'
import {
  builtinProtocols,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
} from '@vltpkg/spec'

const builtins = {
  registries: defaultRegistries,
  'jsr-registries': defaultJsrRegistries,
  'git-hosts': defaultGitHosts,
}

type SpecAliasField = keyof typeof builtins

const fields = Object.keys(builtins) as SpecAliasField[]

/**
 * Throw `ECONFIG` if a spec prefix alias is in more than one of
 * `registries` / `jsr-registries` / `git-hosts` (built-ins included),
 * or is a built-in protocol. Overriding a built-in in its own field is ok.
 */
export const assertSpecAliases = (
  values: Partial<Record<SpecAliasField, Record<string, string>>>,
): void => {
  const owners = new Map<
    string,
    { field: SpecAliasField; builtin: boolean }
  >()
  for (const field of fields) {
    for (const key of Object.keys(builtins[field])) {
      if (values[field]?.[key] === undefined) {
        owners.set(key, { field, builtin: true })
      }
    }
  }
  for (const field of fields) {
    for (const key of Object.keys(values[field] ?? {})) {
      const name = `${field}.${key}`
      if (builtinProtocols.has(key)) {
        throw error(
          `${name} shadows the built-in \`${key}:\` protocol`,
          {
            code: 'ECONFIG',
            name,
            found: key,
            wanted: 'a name that is not a built-in protocol',
          },
        )
      }
      const owner = owners.get(key)
      if (owner) {
        const where = `${owner.field}.${key}${owner.builtin ? ' (built-in)' : ''}`
        throw error(
          `\`${key}:\` spec prefix defined in both ${where} and ${name}`,
          {
            code: 'ECONFIG',
            name,
            found: key,
            wanted: `a ${field} name not used by ${owner.field}`,
          },
        )
      }
      owners.set(key, { field, builtin: false })
    }
  }
}
