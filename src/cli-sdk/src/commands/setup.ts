import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import { defaultRegistries } from '@vltpkg/spec'
import { createInterface } from 'node:readline/promises'
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
  const which: 'user' | 'project' =
    conf.get('config') === 'project' ? 'project' : 'user'

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

    // 3. merge any user-supplied registry aliases (skip built-in defaults)
    const builtinRegistries = defaultRegistries as Record<
      string,
      string
    >
    for (const [name, url] of Object.entries(
      conf.options.registries,
    )) {
      if (builtinRegistries[name] === url) continue
      registries[name] = normalizeRegistryURL(url)
    }

    const rc = new RegistryClient(conf.options)

    // 4. authenticate against the account registries (interactive only)
    if (!yes) {
      const doAuth = await ask(
        'Authenticate with your vlt.io account now? (Y/n) ',
      )
      if (!/^n/i.test(doAuth)) {
        for (const name of accountRegistries) {
          stdout(`Authenticating against the "${name}" registry...`)
          await rc.login(accountRegistryURL(account, name))
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

    return { account, which, registries }
  } finally {
    if (rl) {
      rl.close()
      process.stdin.pause()
    }
  }
}
