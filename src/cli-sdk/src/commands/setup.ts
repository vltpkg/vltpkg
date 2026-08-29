import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import { defaultRegistries } from '@vltpkg/spec'
import { asError, isErrorWithCause, isObject } from '@vltpkg/types'
import { createInterface } from 'node:readline/promises'
import { configWriteTarget } from '../config/index.ts'
import { registrySelectionFields } from '../config/merge-layers.ts'
import { commandUsage } from '../config/usage.ts'
import { stdout } from '../output.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

/** Where users sign up for / log into a vlt.io account. */
export const VLT_SIGNUP_URL = 'https://www.vlt.io'
/** Base URL that per-account registries live under. */
export const VLT_REGISTRY_BASE = 'https://registry.vlt.io'

/**
 * The registry aliases that every vlt.io account is provisioned with.
 * `npm` is the {@link https://docs.vlt.sh | default bare-spec alias}.
 */
export const accountRegistries = ['npm', 'main'] as const

/** Build the per-account registry URL for a given registry name. */
export const accountRegistryURL = (
  account: string,
  name: string,
): string =>
  `${VLT_REGISTRY_BASE}/${encodeURIComponent(account)}/${name}/`

/**
 * The account registries live at `${VLT_REGISTRY_BASE}/<account>/<name>/`, so
 * an account slug that doesn't exist is a 404 from the login endpoint. Say
 * that in terms of the slug the user typed, rather than passing along the
 * bare HTTP failure.
 */
const accountAuthError = (account: string, er: unknown): Error =>
  (
    isErrorWithCause(er) &&
    isObject(er.cause) &&
    er.cause.status === 404
  ) ?
    error(
      [
        `No vlt.io account or organization named "${account}".`,
        '',
        `Looked for it at ${accountRegistryURL(account, accountRegistries[0])}`,
        '',
        'Check the spelling of the slug, or sign up / create the',
        `organization at ${VLT_SIGNUP_URL}, then run \`vlt setup\` again.`,
      ].join('\n'),
      { code: 'ECONFIG', cause: er },
    )
  : asError(er)

/** Ensure a registry URL ends with a single trailing slash. */
const normalizeRegistryURL = (url: string): string =>
  url.endsWith('/') ? url : `${url}/`

export type SetupResult = {
  /** the account slug the registries were built for */
  account: string
  /** which config file the registries were written to */
  which: 'user' | 'project'
  /** the alias -> url map that was staged into config */
  registries: Record<string, string>
  /**
   * set when the config we wrote to is outranked for registry selection by
   * the project's `vlt.json`, so the result won't take effect here.
   */
  shadowedByProject?: boolean
}

export const views = {
  human: (result: SetupResult): string => {
    const lines = [
      `Configured ${Object.keys(result.registries).length} registry ${
        Object.keys(result.registries).length === 1 ?
          'alias'
        : 'aliases'
      } for "${result.account}" in ${result.which} config:`,
    ]
    for (const [name, url] of Object.entries(result.registries)) {
      lines.push(`  ${name} -> ${url}`)
    }
    if (result.shadowedByProject) {
      lines.push(
        '',
        `Note: this project's vlt.json configures its own registries, and`,
        'project config takes precedence. Re-run with `--config=project`',
        'to configure this project instead.',
      )
    }
    lines.push(
      '',
      'You can now install packages, e.g.:',
      '  vlt install <pkg>',
    )
    return lines.join('\n')
  },
} as const satisfies Views<SetupResult>

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'setup',
    usage: '[<account>]',
    description: `Configure the registry aliases for your vlt.io account so
                  that \`vlt install\` and \`vlx\` work out of the box.

                  Sign up or log in at ${VLT_SIGNUP_URL} first. The wizard
                  authenticates against your account and writes the
                  \`npm\` and \`main\` registry aliases (and any additional
                  aliases you add) to your user \`vlt.json\`.`,
    options: {
      config: {
        value: '<user | project>',
        description:
          'Which config file to write to. Defaults to `user`; pass ' +
          '`--config=project` to write to the project `vlt.json`.',
      },
      registries: {
        value: '<name=url>',
        description:
          'Additional registry aliases to stage non-interactively. ' +
          'Combine with `--yes` to run setup unattended.',
      },
      yes: {
        description:
          'Skip interactive prompts (requires <account> and does not ' +
          'open a browser for authentication).',
      },
    },
  })

export const command: CommandFn<SetupResult> = async conf => {
  const yes = !!conf.get('yes')
  const which = configWriteTarget(conf, 'user')

  let rl: ReturnType<typeof createInterface> | undefined
  const ask = async (question: string): Promise<string> => {
    rl ??= createInterface(process.stdin, process.stdout)
    return (await rl.question(question)).trim()
  }

  try {
    stdout(
      `Sign up or log in at ${VLT_SIGNUP_URL} before continuing.`,
    )

    // 1. resolve the account slug
    let account = conf.positionals[0]?.trim()
    if (!account) {
      if (yes) {
        throw error(
          'An account slug is required in non-interactive mode. ' +
            'Pass it as an argument: `vlt setup <account> --yes`.',
          { code: 'ECONFIG' },
        )
      }
      account = await ask('vlt.io account or organization slug: ')
      if (!account) {
        throw error('No account slug provided.', { code: 'ECONFIG' })
      }
    }

    // 2. stage the two known account registries
    const registries: Record<string, string> = {}
    for (const name of accountRegistries) {
      registries[name] = accountRegistryURL(account, name)
    }

    // 3. merge in registry aliases supplied for this invocation. aliases
    // that came from a config file are left where they are: copying them
    // would turn a project-local alias into a global one (or vice versa).
    const builtinRegistries = defaultRegistries as Record<
      string,
      string
    >
    const fileRegistries: Record<string, string> = {
      ...conf.layers.user?.registries,
      ...conf.layers.project?.registries,
    }
    for (const [name, url] of Object.entries(
      conf.options.registries,
    )) {
      if (builtinRegistries[name] === url) continue
      if (fileRegistries[name] === url) continue
      registries[name] = normalizeRegistryURL(url)
    }

    const rc = new RegistryClient(conf.options)

    // 4. authenticate against the account registries (interactive only)
    if (!yes) {
      const doAuth = await ask(
        'Authenticate with your vlt.io account now? (Y/n) ',
      )
      if (!/^n/i.test(doAuth)) {
        // one token covers every registry on the account, so the browser
        // opens once and the token is stored for all of them.
        stdout(
          `Authenticating your account registries (${accountRegistries.join(
            ', ',
          )})...`,
        )
        try {
          await rc.login(
            accountRegistries.map(name =>
              accountRegistryURL(account, name),
            ),
          )
        } catch (er) {
          throw accountAuthError(account, er)
        }
      }

      // 5. offer to add further custom aliases
      for (;;) {
        const more = await ask('Add another registry alias? (y/N) ')
        if (!/^y/i.test(more)) break
        const name = await ask('  alias name: ')
        if (!name) {
          stdout('  alias name is required, skipping.')
          continue
        }
        if (name in registries) {
          stdout(`  alias "${name}" is already staged, skipping.`)
          continue
        }
        const url = await ask('  registry url: ')
        if (!url) {
          stdout('  registry url is required, skipping.')
          continue
        }
        const normalized = normalizeRegistryURL(url)
        registries[name] = normalized
        const auth = await ask(
          `  authenticate against "${name}" now? (y/N) `,
        )
        if (/^y/i.test(auth)) {
          await rc.login(normalized)
        }
      }
    }

    // 6. persist the staged registries (merged, not clobbered)
    await conf.addConfigToFile(which, { registries })

    // writing the user config from inside a project that configures its own
    // registries has no effect here, so say so rather than looking like it
    // worked.
    const shadowedByProject =
      which === 'user' &&
      registrySelectionFields.some(
        f => f in (conf.layers.project ?? {}),
      )

    return {
      account,
      which,
      registries,
      ...(shadowedByProject ? { shadowedByProject } : undefined),
    }
  } finally {
    if (rl) {
      rl.close()
      process.stdin.pause()
    }
  }
}
