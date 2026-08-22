import { error } from '@vltpkg/error-cause'
import { defaultRegistries, defaultRegistryName } from '@vltpkg/spec'
import { selectRegistry } from './select-registry.ts'
import type { RegistryCandidate } from './select-registry.ts'
import type { LoadedConfig } from './config/index.ts'

/**
 * There is no default registry. This is the single message used
 * everywhere a registry is required but missing.
 */
export const missingRegistryError = (): Error =>
  error(
    [
      'Missing registry configuration.',
      '',
      'vlt has no default registry. Run `vlt setup` to get configured.',
      '',
      'See https://docs.vlt.sh/cli for other ways to set a registry.',
    ].join('\n'),
    { code: 'ECONFIG' },
  )

/**
 * Install-related commands need the alias that bare specs resolve
 * through (not merely some other configured registry) so packages and
 * transitive deps get stable, alias-keyed DepIDs. That alias is
 * `registries.npm` unless `default-registry-alias` points elsewhere.
 */
export const missingNpmRegistryError = (
  alias: string = defaultRegistryName,
): Error =>
  error(
    [
      `Missing ${alias} registry configuration.`,
      '',
      `Install commands require the \`registries.${alias}\` alias.`,
      'Run `vlt setup` to get configured.',
      '',
      'See https://docs.vlt.sh/cli for other ways to set a registry.',
    ].join('\n'),
    { code: 'ECONFIG' },
  )

/**
 * Multiple registries are configured and none was selected. Used in
 * non-interactive contexts where we cannot prompt and there is no
 * `default-registry-alias` to fall back to.
 */
export const ambiguousRegistryError = (
  candidates: RegistryCandidate[],
): Error =>
  error(
    [
      'Multiple registries are configured; specify which one to use.',
      '',
      'Run `vlt registry <alias> <command>` with one of:',
      ...candidates.map(c => `  ${c.alias} -> ${c.url}`),
    ].join('\n'),
    {
      code: 'ECONFIG',
      validOptions: candidates.map(c => c.alias),
    },
  )

/**
 * Resolve a named registry alias to its URL, throwing an `ECONFIG`
 * error (listing the known aliases) when the alias is not configured.
 */
export const resolveRegistryAlias = (
  conf: LoadedConfig,
  alias: string,
): string => {
  const url = conf.options.registries[alias]
  if (!url) {
    throw error(`Unknown registry alias: ${alias}`, {
      code: 'ECONFIG',
      found: alias,
      validOptions: Object.keys(conf.options.registries),
    })
  }
  return url
}

/**
 * The registries the user has actually configured, when no explicit
 * `--registry` URL is set. Order follows the `registries` config (which
 * preserves insertion order).
 *
 * Built-in defaults (eg `gh`) are excluded so they don't implicitly
 * satisfy "a registry is configured" for account/auth commands. A
 * built-in alias the user has overridden to a different URL counts as
 * configured. Built-in aliases can still be targeted explicitly via
 * `vlt registry <alias> <cmd>` (which resolves through
 * {@link resolveRegistryAlias}).
 */
const gatherCandidates = (
  conf: LoadedConfig,
): RegistryCandidate[] => {
  const builtins = defaultRegistries as Record<string, string>
  return Object.entries(conf.options.registries)
    .filter(([alias, url]) => builtins[alias] !== url)
    .map(([alias, url]) => ({ alias, url }))
}

/**
 * Whether the current config provides a registry a `needsRegistry`
 * command could act against without prompting for setup. True when an
 * explicit `--registry` URL is set or the user has configured at least
 * one non-default registry alias. Kept consistent with
 * {@link resolveRegistry} so the pre-command gate never rejects a config
 * the resolver would otherwise accept or prompt for.
 */
export const hasConfiguredRegistry = (conf: LoadedConfig): boolean =>
  !!conf.options.registry || gatherCandidates(conf).length > 0

/**
 * Whether the alias bare specs resolve through is configured:
 * `registries.npm` by default, or whatever `default-registry-alias`
 * points at. A scalar `--registry` or some unrelated alias is not
 * enough: install-related commands need the default alias itself.
 * Kept next to {@link hasConfiguredRegistry} so both pre-command
 * gates share the same config surface.
 */
export const hasNpmRegistry = (conf: LoadedConfig): boolean =>
  !!conf.options.registries[conf.options['default-registry-alias']]

/**
 * Synchronous, non-interactive registry resolution used by
 * programmatic callers. Precedence: explicit alias > `--registry`
 * scalar > single configured alias > `default-registry-alias`. Throws
 * when nothing is configured or the choice is ambiguous.
 */
export const requireRegistry = (
  conf: LoadedConfig,
  alias?: string,
): string => {
  if (alias !== undefined) return resolveRegistryAlias(conf, alias)
  const { registry } = conf.options
  if (registry) return registry
  const candidates = gatherCandidates(conf)
  const [first, second] = candidates
  if (!first) throw missingRegistryError()
  if (!second) return first.url
  const defaultUrl =
    conf.options.registries[conf.options['default-registry-alias']]
  if (defaultUrl) return defaultUrl
  throw ambiguousRegistryError(candidates)
}

/**
 * Resolve the registry a command should act against.
 *
 * Precedence: explicit `alias` (from `vlt registry <alias> <cmd>`) >
 * `--registry` URL scalar > the single configured alias. When multiple
 * aliases are configured and none was chosen, prompt interactively on a
 * TTY, otherwise fall back to `default-registry-alias`, else error.
 */
export const resolveRegistry = async (
  conf: LoadedConfig,
  {
    alias,
    interactive = process.stdin.isTTY,
    input,
    output,
  }: {
    alias?: string
    interactive?: boolean
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
  } = {},
): Promise<string> => {
  if (alias !== undefined) return resolveRegistryAlias(conf, alias)
  const { registry } = conf.options
  if (registry) return registry
  const candidates = gatherCandidates(conf)
  const [first, second] = candidates
  if (!first) throw missingRegistryError()
  if (!second) return first.url

  const defaultAlias = conf.options['default-registry-alias']
  if (interactive) {
    return selectRegistry(candidates, { defaultAlias, input, output })
  }
  const defaultUrl = conf.options.registries[defaultAlias]
  if (defaultUrl) return defaultUrl
  throw ambiguousRegistryError(candidates)
}
