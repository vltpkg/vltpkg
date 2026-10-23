import { error } from '@vltpkg/error-cause'
import {
  getKC,
  normalizeRegistryKey,
  RegistryClient,
} from '@vltpkg/registry-client'
import { defaultRegistries } from '@vltpkg/spec'
import { asError, isErrorWithCause, isObject } from '@vltpkg/types'
import { createInterface } from 'node:readline/promises'
import { configWriteTarget } from '../config/index.ts'
import type { LoadedConfig } from '../config/index.ts'
import { registrySelectionFields } from '../config/merge-layers.ts'
import { commandUsage } from '../config/usage.ts'
import { normalizeRegistryURL } from '../require-registry.ts'
import { stdout } from '../output.ts'
import { resolveGlobalBinDir } from '../global-bin-dir.ts'
import {
  detectShell,
  prettyPath,
  shellPathCommand,
} from '../shell.ts'
import type { Shell } from '../shell.ts'
import {
  applyPathSetup,
  ask as askLine,
  pathSetupChanged,
  pathSetupFiles,
  pathSetupLines,
  planPathSetup,
  rcList,
  sourceCommand,
} from '../shell-setup/index.ts'
import type { PathSetupFile } from '../shell-setup/index.ts'
import { editPathHint } from '../shell-setup/windows.ts'
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
 * Path-scoped keychain keys do not match sibling registries
 * (`…/<account>/main` vs `…/<account>/npm`). One account token covers
 * both, so when the keychain holds it for only one alias, copy it to
 * the other.
 */
export const persistAccountTokens = async (
  account: string,
  identity: string,
): Promise<void> => {
  // keychain only: getToken() also returns env/runtime tokens
  const kc = getKC(identity)
  const keys = accountRegistries.map(name =>
    normalizeRegistryKey(accountRegistryURL(account, name)),
  )
  const tokens = await Promise.all(keys.map(k => kc.get(k)))
  const token = tokens.find(Boolean)
  if (!token) return
  // fill gaps only: never overwrite an existing (maybe newer) token
  for (const [i, key] of keys.entries()) {
    if (!tokens[i]) kc.set(key, token)
  }
  await kc.save()
}

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
  /**
   * PATH step outcome; absent when skipped (--yes, no terminal,
   * no-modify-path)
   */
  path?: SetupPathResult['path'] | SetupPathFailed
}

export type SetupPathFailed = {
  status: 'failed'
  /** why; may hold the manual line */
  message: string
}

export type SetupPathResult = {
  path: {
    status:
      'added' | 'unchanged' | 'in-path' | 'disabled' | 'cancelled'
    /** canonical dir added to the PATH */
    dir: string
    shell: Shell
    files: PathSetupFile[]
    backups: string[]
    /** manual line for the shell */
    command: string
    /** loads it in the current shell */
    source: string
  }
}

const pathView = (
  r: SetupPathResult['path'] | SetupPathFailed,
  wizard = false,
): string => {
  if (r.status === 'failed') {
    return `⚠️  Could not add the global bin folder to your PATH: ${r.message}`
  }
  const dir = prettyPath(r.dir)
  const rcs = rcList(r.files)
  // the command lasts one session
  const keep =
    process.platform === 'win32' ?
      [`  To keep it: ${editPathHint}`]
    : []
  switch (r.status) {
    case 'added':
      return pathSetupLines(r, r.source).join('\n')
    case 'unchanged':
      return [
        `✅ ${dir} is already added to your PATH in ${rcs}`,
        `   Open a new terminal, or run: ${r.source}`,
      ].join('\n')
    case 'in-path':
      return wizard ? '' : `✅ ${dir} is already on your PATH`
    case 'disabled':
      return [
        `ℹ️  no-modify-path is set, so nothing was changed. To add ${dir} to your PATH, run:`,
        `  ${r.command}`,
        ...keep,
      ].join('\n')
    case 'cancelled':
      if (wizard) {
        return `ℹ️  Skipped. Run \`vlt setup --path\` later to add ${dir} to your PATH.`
      }
      return [
        `Nothing changed. To add ${dir} to your PATH, run:`,
        `  ${r.command}`,
        ...keep,
      ].join('\n')
  }
}

export const views = {
  human: (result: SetupResult | SetupPathResult): string => {
    if (!('account' in result)) return pathView(result.path)
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
    const path = result.path && pathView(result.path, true)
    if (path) lines.push('', path)
    lines.push(
      '',
      'You can now install packages, e.g.:',
      '  vlt install <pkg>',
    )
    return lines.join('\n')
  },
} as const satisfies Views<SetupResult | SetupPathResult>

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'setup',
    usage: [
      '[<account>]',
      '--path [--yes] [--global-bin-dir=<path>]',
    ],
    description: `Configure the registry aliases for your vlt.io account so
                  that \`vlt install\` and \`vlx\` work out of the box.

                  Sign up or log in at ${VLT_SIGNUP_URL} first. The wizard
                  authenticates against your account, stores the token
                  for both the \`npm\` and \`main\` registries, and writes
                  those aliases (and any additional aliases you add) to
                  your user \`vlt.json\`.

                  In a terminal, if the global bin folder isn't on
                  your \`PATH\` or set up yet, it ends by asking
                  \`Setup PATH for global installs? (Y/n)\`: yes adds
                  it (same as \`--path\`), no skips it. Run
                  \`vlt setup --path\` later to do just that step.

                  With \`--path\`, add the global bin folder
                  (\`--global-bin-dir\`) to your \`PATH\` instead: writes
                  \`<global-dir>/env\` and a marked section that loads
                  it into your shell config. On Windows it adds it to
                  your user \`Path\` (\`HKCU\\Environment\`).`,
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
          'open a browser for authentication). With --path: edit ' +
          'without asking. Without --path: skips the PATH prompt.',
      },
      path: {
        description:
          'Only add the global bin folder to your PATH via your ' +
          'shell config (user Path on Windows).',
      },
      'global-bin-dir': {
        value: '<path>',
        description: 'The folder to add to your PATH.',
      },
    },
  })

type PathStep = {
  globalDir: string
  globalBinDir?: string
  yes?: boolean
  noModifyPath?: boolean
  question: (o: { dir: string; rcs: string }) => string
  /** default: readline on stdin/stdout */
  ask?: (q: string) => Promise<string>
}

const runPathSetup = async (
  o: PathStep,
): Promise<SetupPathResult['path']> => {
  const root = o.globalDir
  const bin = await resolveGlobalBinDir({
    projectRoot: root,
    globalBinDir: o.globalBinDir,
  })
  const shell = detectShell()
  const base = {
    dir: bin.dir,
    shell,
    files: [] as PathSetupFile[],
    backups: [] as string[],
    command: shellPathCommand(shell, bin.dir),
    source: sourceCommand(shell, root, bin.dir),
  }
  if (bin.inPath) {
    return { ...base, status: 'in-path' }
  }
  // scripted installers must not fail
  if (o.noModifyPath) {
    return { ...base, status: 'disabled' }
  }
  const opts = { globalDir: root, dir: bin.dir, shell }
  let plan = await planPathSetup(opts)
  const files = pathSetupFiles(plan)
  if (!pathSetupChanged(plan)) {
    return { ...base, status: 'unchanged', files }
  }
  if (!o.yes) {
    if (!process.stdin.isTTY) {
      throw error(
        'Not a terminal: pass --yes to add it to your PATH',
        {
          code: 'EUSAGE',
        },
      )
    }
    const answer = await (o.ask ?? askLine)(
      o.question({ dir: prettyPath(bin.dir), rcs: rcList(files) }),
    ).catch((er: unknown) => {
      // Ctrl-C
      if (asError(er).name !== 'AbortError') throw er
      process.stdout.write('\n')
      return 'n'
    })
    if (/^n/i.test(answer)) {
      return { ...base, status: 'cancelled', files }
    }
    // rc files may have changed while asking
    plan = await planPathSetup(opts)
  }
  const r = await applyPathSetup(plan)
  return {
    ...base,
    status: 'added',
    files: r.files,
    backups: r.backups,
  }
}

const setupPath = async (
  conf: LoadedConfig,
  root: string,
): Promise<SetupPathResult> => {
  if (conf.positionals.length) {
    throw error('`vlt setup --path` takes no arguments', {
      code: 'EUSAGE',
      found: conf.positionals[0],
    })
  }
  return {
    path: await runPathSetup({
      globalDir: root,
      globalBinDir: conf.globalBinDir,
      yes: !!conf.get('yes'),
      noModifyPath: !!conf.get('no-modify-path'),
      question: ({ dir, rcs }) =>
        `Add ${dir} to your PATH in ${rcs}? (Y/n) `,
    }),
  }
}

// end of the wizard, in a terminal only
const offerPath = async (
  conf: LoadedConfig,
  yes: boolean,
  ask: (q: string) => Promise<string>,
): Promise<SetupResult['path']> => {
  if (yes || !process.stdin.isTTY || conf.get('no-modify-path')) {
    return
  }
  const g = conf.globalProject()
  if (!g) return
  try {
    return await runPathSetup({
      globalDir: g.root,
      globalBinDir: g.binDir,
      question: () => 'Setup PATH for global installs? (Y/n) ',
      ask,
    })
  } catch (er) {
    // registries are already saved
    const e = asError(er)
    // e.g. the global-bin-dir that could not be created
    const found =
      (
        isErrorWithCause(e) &&
        isObject(e.cause) &&
        typeof e.cause.found === 'string'
      ) ?
        prettyPath(e.cause.found)
      : undefined
    return {
      status: 'failed',
      message:
        found && !e.message.includes(found) ?
          `${e.message}: ${found}`
        : e.message,
    }
  }
}

export const command: CommandFn<
  SetupResult | SetupPathResult
> = async conf => {
  // set only by --path, see Config#globalProject
  const root = conf.globalRoot
  if (root) return setupPath(conf, root)
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
        // one login covers both account registries; the token is stored
        // for each of them so path-scoped keychain lookups match.
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

    // 7. fill a missing `npm`/`main` keychain entry from the other.
    // no-op after login(), which already wrote both. runs after the
    // config write so a keychain failure can't block it.
    await persistAccountTokens(account, conf.options.identity)

    // writing the user config from inside a project that configures its own
    // registries has no effect here, so say so rather than looking like it
    // worked.
    const shadowedByProject =
      which === 'user' &&
      registrySelectionFields.some(
        f => f in (conf.layers.project ?? {}),
      )

    // 8. offer PATH setup for global installs
    const path = await offerPath(conf, yes, ask)

    return {
      account,
      which,
      registries,
      ...(shadowedByProject ? { shadowedByProject } : undefined),
      ...(path ? { path } : undefined),
    }
  } finally {
    if (rl) {
      rl.close()
      process.stdin.pause()
    }
  }
}
