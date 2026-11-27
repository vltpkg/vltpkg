import { error } from '@vltpkg/error-cause'
import {
  RegistryClient,
  assertOk,
  registryBase,
  requestError,
} from '@vltpkg/registry-client'
import type { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import hostedGitInfo from 'hosted-git-info'
import { basename, dirname } from 'node:path'
import { styleText } from 'node:util'
import { commandUsage } from '../config/usage.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { stderr, styleTextStderr } from '../output.ts'
import { localPublishRegistry } from '../publish-config.ts'
import { resolveRegistry } from '../require-registry.ts'
import { confirm, interactive } from '../skills-prompt.ts'
import type { ViewOptions, Views } from '../view.ts'

const { fromUrl } = hostedGitInfo as unknown as {
  fromUrl: (
    url: string,
  ) => { type: string; user: string; project: string } | undefined
}

const subcommands = ['github', 'list', 'ls', 'revoke']

const githubUsage =
  '[<pkg>] --file=<workflow> [--repository=<owner/repo>] [--environment=<name>] [--allow-publish] [--allow-stage-publish]'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'trust',
    usage: [
      `github ${githubUsage}`,
      'list [<pkg>]',
      'revoke [<pkg>] --id=<trust-id>',
    ],
    description: `Manage the CI workflows trusted to publish a package.

    A trusted publisher is a CI workflow the registry lets publish a
    package with no stored token: the job swaps its identity token for
    a short-lived registry token.

    \`<pkg>\` defaults to the package in the current directory. The
    registry is the \`publishConfig.registry\` of the package in the
    current directory when that package is \`<pkg>\`, else the
    configured registry.`,
    subcommands: {
      github: {
        usage: githubUsage,
        description:
          'Trust a GitHub Actions workflow to publish a package. Asks for confirmation and needs a second factor.',
      },
      list: {
        usage: '[<pkg>]',
        description:
          'List the trusted publishers of a package. Alias: `ls`.',
      },
      revoke: {
        usage: '[<pkg>] --id=<trust-id>',
        description:
          'Remove a trusted publisher. Needs a second factor.',
      },
    },
    options: {
      file: {
        value: '<workflow>',
        description:
          'Name of the workflow file in `.github/workflows`, such as `release.yml`.',
      },
      repository: {
        value: '<owner/repo>',
        description:
          'GitHub repository of the workflow. Defaults to the `repository` of the package in the current directory. Alias: `--repo`.',
      },
      environment: {
        value: '<name>',
        description:
          'GitHub environment the job of the workflow must run in.',
      },
      'allow-publish': {
        description: 'Let the workflow run `vlt publish`.',
      },
      'allow-stage-publish': {
        description:
          'Let the workflow run `vlt stage publish`. Alias: `--allow-staged-publish`.',
      },
      yes: {
        description:
          'Create the trusted publisher without asking for confirmation.',
      },
      id: {
        value: '<trust-id>',
        description:
          'Id of the trusted publisher to revoke, as `vlt trust list` prints it.',
      },
      'dry-run': {
        description:
          'Show what would be created or revoked without sending it.',
      },
      otp: {
        value: '<otp>',
        description:
          'One-time password to create or revoke a trusted publisher with.',
      },
    },
  })

/** A trusted publisher as the registry describes it. */
type TrustConfig = {
  id?: string
  type?: string
  claims?: {
    repository?: string
    workflow_ref?: { file?: string }
    environment?: string
  }
  permissions?: string[]
}

/** A trusted publisher as it is shown: npm's flattened fields. */
export type TrustItem = {
  type?: string
  id?: string
  file?: string
  repository?: string
  environment?: string
  permissions?: string[]
}

export type TrustRevoked = {
  package: string
  id: string
  /** `false` with `--dry-run`: nothing was sent */
  revoked: boolean
}

/** With `--dry-run` it has no `id`: nothing was sent. */
export type TrustCreated = TrustItem & { package: string }

export type CommandResult = TrustItem[] | TrustRevoked | TrustCreated

/** npm's order, absent fields dropped. */
const toItem = ({
  id,
  type,
  claims,
  permissions,
}: TrustConfig): TrustItem =>
  Object.fromEntries(
    Object.entries({
      type,
      id,
      file: claims?.workflow_ref?.file,
      repository: claims?.repository,
      environment: claims?.environment,
      permissions,
    }).filter(([, v]) => v !== undefined),
  )

/** npm's permission names, as shown to people. */
const permissionLabels: Record<string, string> = {
  createPackage: 'publish',
  createStagedPackage: 'stage publish',
}

type Style = (s: string) => string
type Styles = Record<'bold' | 'reset' | 'yellow', Style>

// colors as `vlt stage`: bold keys and titles, the id highlighted
const styles = (
  style: (format: 'bold' | 'reset' | 'yellow', s: string) => string,
): Styles => ({
  bold: s => style('bold', s),
  reset: s => style('reset', s),
  yellow: s => style('yellow', s),
})

const plain = styles((_, s) => s)

const viewStyles = ({ colors }: ViewOptions): Styles =>
  colors ?
    styles((format, s) =>
      styleText(format, s, { validateStream: false }),
    )
  : plain

const itemLines = (
  { permissions, ...rest }: TrustItem,
  { bold, yellow }: Styles,
): string =>
  Object.entries({
    ...rest,
    ...(permissions && {
      permissions: permissions
        .map(p => permissionLabels[p] ?? p)
        .join(', '),
    }),
  })
    .map(([k, v]) => `${bold(`${k}:`)} ${k === 'id' ? yellow(v) : v}`)
    .join('\n')

export const views = {
  human: (result, options, conf) => {
    const s = viewStyles(options)
    if (Array.isArray(result)) {
      return result.length ?
          s.reset(result.map(i => itemLines(i, s)).join('\n\n'))
        : 'No trusted publishers found.'
    }
    if ('revoked' in result) {
      const { id, package: pkg, revoked } = result
      return revoked ?
          `Revoked trusted publisher ${id} of ${pkg}.`
        : `Would revoke trusted publisher ${id} of ${pkg} (dry run).`
    }
    const { package: pkg, ...item } = result
    const heading =
      conf.options['dry-run'] ?
        `🤲 ${s.bold(`Would create this trusted publisher for ${pkg} (dry run):`)}`
      : `🤝 ${s.bold(`Trusted publisher created for ${pkg}:`)}`
    // a blank line apart from the question and sign-in printed before
    return `\n${s.reset(`${heading}\n${itemLines(item, s)}`)}`
  },
  json: r => r,
} as const satisfies Views<CommandResult>

/** The manifest of the package in the current directory, if any. */
const localManifest = (conf: LoadedConfig) => {
  const { packageJson } = conf.options
  const path = packageJson.find(process.cwd())
  return path ? packageJson.read(dirname(path)) : undefined
}

/** `<pkg>`, else the name of the package in the current directory. */
const packageName = (
  conf: LoadedConfig,
  arg: string | undefined,
): string => {
  const name =
    arg ?
      Spec.parseArgs(arg, conf.options).name
    : localManifest(conf)?.name
  if (!name) {
    throw error(
      'Package name must be given as an argument or in package.json',
      { code: 'EUSAGE' },
    )
  }
  return name
}

/** `owner/repo` of the local package, when it is `name` and on GitHub. */
const localRepository = (
  conf: LoadedConfig,
  name: string,
): string | undefined => {
  const manifest = localManifest(conf)
  if (manifest?.name !== name) return undefined
  const { repository } = manifest
  const url =
    typeof repository === 'string' ? repository : repository?.url
  const info = url ? fromUrl(url) : undefined
  return info?.type === 'github' ?
      `${info.user}/${info.project}`
    : undefined
}

/**
 * The URL of the registry's `-/package/<name>/trust` route, or of the
 * trusted publisher `id` under it. The registry is the local package's
 * `publishConfig.registry` when that package is `name`, as for
 * `vlt publish`, else the configured one.
 */
const trustUrl = async (
  conf: LoadedConfig,
  name: string,
  id?: string,
): Promise<URL> => {
  const registry = registryBase(
    localPublishRegistry(conf, name) ?? (await resolveRegistry(conf)),
  )
  const path = `-/package/${name.replace('/', '%2f')}/trust`
  return new URL(
    id ? `${path}/${encodeURIComponent(id)}` : path,
    registry,
  )
}

/** An uncached request to a trust route, `body` sent as JSON. */
const trustRequest = async (
  conf: LoadedConfig,
  url: URL,
  message: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<CacheEntry> => {
  let response: CacheEntry
  try {
    response = await new RegistryClient(conf.options).request(url, {
      method,
      useCache: false,
      headers: {
        'npm-auth-type': 'web',
        'npm-command': 'trust',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      otp: conf.options.otp,
    })
  } catch (err) {
    throw requestError(err, { message, url, method })
  }
  assertOk(response, { message, url, method })
  return response
}

const github = async (
  conf: LoadedConfig,
  name: string,
): Promise<TrustCreated | undefined> => {
  const o = conf.options
  const permissions = [
    ...(o['allow-publish'] ? ['createPackage'] : []),
    ...(o['allow-stage-publish'] || o['allow-staged-publish'] ?
      ['createStagedPackage']
    : []),
  ]
  if (!permissions.length) {
    throw error(
      'At least one of --allow-publish and --allow-stage-publish is required',
      { code: 'EUSAGE' },
    )
  }
  const { file, environment } = o
  if (!file) {
    throw error('Workflow file must be given with --file', {
      code: 'EUSAGE',
    })
  }
  if (!/\.ya?ml$/.test(file) || basename(file) !== file) {
    throw error(
      'Workflow file must be a file name ending in .yml or .yaml, not a path',
      { code: 'EUSAGE', found: file },
    )
  }
  const repository =
    o.repository ?? o.repo ?? localRepository(conf, name)
  if (!repository) {
    throw error(
      'Repository must be given with --repository or the repository field of package.json',
      { code: 'EUSAGE' },
    )
  }
  if (repository.split('/').length !== 2) {
    throw error('Repository must be in the format owner/repo', {
      code: 'EUSAGE',
      found: repository,
    })
  }
  const config: TrustConfig = {
    type: 'github',
    claims: {
      repository,
      workflow_ref: { file },
      ...(environment ? { environment } : {}),
    },
    permissions,
  }
  if (o['dry-run']) return { package: name, ...toItem(config) }
  if (!o.yes && !interactive()) {
    throw error(
      'Not a terminal: pass --yes to create the trusted publisher',
      { code: 'EUSAGE' },
    )
  }
  // the registry is resolved, or prompted for, before the question
  const url = await trustUrl(conf, name)
  if (!o.yes) {
    const s = styles(styleTextStderr)
    stderr(
      `\n${s.reset(
        [
          `🤲 ${s.bold(`Establishing trust between ${name} and GitHub Actions.`)}`,
          `Anyone with write access to ${repository} can ${permissions
            .map(p => permissionLabels[p])
            .join(' and ')} ${name}.`,
          itemLines(toItem(config), s),
        ].join('\n'),
      )}`,
    )
    if (!(await confirm('Do you want to proceed? (y/N) '))) {
      stderr('Cancelled: no trusted publisher was created.')
      // exit 1 without usage: the usage was fine
      process.exitCode = 1
      return undefined
    }
  }
  const response = await trustRequest(
    conf,
    url,
    'Failed to create trusted publisher',
    'POST',
    [config],
  )
  const [created] = response.json() as unknown as [TrustConfig]
  return { package: name, ...toItem(created) }
}

export const command: CommandFn<
  CommandResult | undefined
> = async conf => {
  const [sub, arg] = conf.positionals
  if (!sub || !subcommands.includes(sub)) {
    throw error(
      sub ?
        'Invalid trust subcommand'
      : 'trust command requires a subcommand',
      { code: 'EUSAGE', found: sub, validOptions: subcommands },
    )
  }
  // arguments are checked before the registry is resolved or prompted for
  const name = packageName(conf, arg)
  if (sub === 'github') return github(conf, name)
  if (sub !== 'revoke') {
    const response = await trustRequest(
      conf,
      await trustUrl(conf, name),
      'Failed to list trusted publishers',
    )
    return (response.json() as unknown as TrustConfig[]).map(toItem)
  }
  const { id, 'dry-run': dry } = conf.options
  if (!id) {
    throw error(
      'Id of the trusted publisher to revoke must be given with --id',
      { code: 'EUSAGE' },
    )
  }
  if (!dry) {
    await trustRequest(
      conf,
      await trustUrl(conf, name, id),
      'Failed to revoke trusted publisher',
      'DELETE',
    )
  }
  return { package: name, id, revoked: !dry }
}
