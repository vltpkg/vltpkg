import { error } from '@vltpkg/error-cause'
import { getCommand } from '../config/definition.ts'
import { commandUsage } from '../config/usage.ts'
import { resolveRegistry } from '../require-registry.ts'
import type { Commands, LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

/**
 * The account/auth commands that can be scoped to a named registry
 * alias via `vlt registry <alias> <command>`.
 */
export const registrySubcommands = [
  'whoami',
  'logout',
  'login',
  'token',
  'access',
  'publish',
  'unpublish',
  'deprecate',
  'dist-tag',
  'profile',
  'ping',
] as const satisfies Commands[keyof Commands][]

const isRegistrySubcommand = (
  s: string | undefined,
): s is (typeof registrySubcommands)[number] => {
  const canonical = getCommand(s)
  return (
    canonical !== undefined &&
    (registrySubcommands as readonly string[]).includes(canonical)
  )
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'registry',
    usage: '<alias> <command> [<args>]',
    description: `Run an account command against a specific configured
                  registry, selected by its \`registries\` alias instead
                  of a full URL.

                  For example, \`vlt registry main whoami\` runs \`whoami\`
                  against the registry configured as \`main\`. Omit the
                  alias (e.g. \`vlt registry whoami\`) to be prompted to
                  choose from the configured registries, or to fall back
                  to \`--default-registry-alias\` when non-interactive.

                  \`<command>\` is one of:
                  ${registrySubcommands.join(', ')}.`,
  })

export const views = {
  human: () => {},
} as const satisfies Views<void>

/**
 * Resolve `vlt registry <alias> <command>` in place: determine the
 * target subcommand and registry, then rewrite `conf` so the outer
 * runner dispatches the real command with the resolved registry
 * injected. When invoked with `--help` or without a subcommand, `conf`
 * is left untouched so the `registry` usage/error is shown instead.
 *
 * Streams / interactivity are injectable for tests.
 */
export const dispatchRegistry = async (
  conf: LoadedConfig,
  {
    interactive,
    input,
    output,
  }: {
    interactive?: boolean
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
  } = {},
): Promise<void> => {
  if (conf.get('help')) return

  const [first, ...restArgs] = conf.positionals
  if (first === undefined) return

  let alias: string | undefined
  let subRaw: string | undefined
  let args: string[]
  if (isRegistrySubcommand(first)) {
    subRaw = first
    args = restArgs
  } else {
    alias = first
    subRaw = restArgs[0]
    args = restArgs.slice(1)
  }

  if (!isRegistrySubcommand(subRaw)) {
    throw error('Unknown registry subcommand', {
      found: subRaw,
      validOptions: [...registrySubcommands],
      code: 'EUSAGE',
    })
  }

  const registry = await resolveRegistry(conf, {
    alias,
    interactive,
    input,
    output,
  })

  conf.options.registry = registry
  conf.values.registry = registry
  conf.command = subRaw
  conf.positionals = args
}

export const command: CommandFn<void> = async conf => {
  // Reached only when dispatchRegistry did not rewrite conf, i.e. no
  // subcommand was provided (help is handled by the runner earlier).
  throw error('Missing registry subcommand', {
    found: conf.positionals[0],
    validOptions: [...registrySubcommands],
    code: 'EUSAGE',
  })
}
