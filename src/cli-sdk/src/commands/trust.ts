import { error } from '@vltpkg/error-cause'
import {
  RegistryClient,
  assertOk,
  registryBase,
  requestError,
} from '@vltpkg/registry-client'
import type { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { dirname } from 'node:path'
import { commandUsage } from '../config/usage.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { localPublishRegistry } from '../publish-config.ts'
import { resolveRegistry } from '../require-registry.ts'
import type { Views } from '../view.ts'

const subcommands = ['list', 'ls', 'revoke']

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'trust',
    usage: ['list [<pkg>]', 'revoke [<pkg>] --id=<trust-id>'],
    description: `Manage the CI workflows trusted to publish a package.

    A trusted publisher is a CI workflow the registry lets publish a
    package with no stored token: the job swaps its identity token for
    a short-lived registry token.

    \`<pkg>\` defaults to the package in the current directory. The
    registry is the \`publishConfig.registry\` of the package in the
    current directory when that package is \`<pkg>\`, else the
    configured registry.`,
    subcommands: {
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
      id: {
        value: '<trust-id>',
        description:
          'Id of the trusted publisher to revoke, as `vlt trust list` prints it.',
      },
      'dry-run': {
        description:
          'Show what would be revoked without revoking it.',
      },
      otp: {
        value: '<otp>',
        description:
          'One-time password to revoke a trusted publisher with.',
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

export type CommandResult = TrustItem[] | TrustRevoked

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

const itemLines = ({ permissions, ...rest }: TrustItem): string =>
  Object.entries({
    ...rest,
    ...(permissions && {
      permissions: permissions
        .map(p => permissionLabels[p] ?? p)
        .join(', '),
    }),
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

export const views = {
  human: result => {
    if (Array.isArray(result)) {
      return result.length ?
          result.map(itemLines).join('\n\n')
        : 'No trusted publishers found.'
    }
    const { id, package: pkg, revoked } = result
    return revoked ?
        `Revoked trusted publisher ${id} of ${pkg}.`
      : `Would revoke trusted publisher ${id} of ${pkg} (dry run).`
  },
  json: r => r,
} as const satisfies Views<CommandResult>

/** `<pkg>`, else the name of the package in the current directory. */
const packageName = (
  conf: LoadedConfig,
  arg: string | undefined,
): string => {
  const { packageJson } = conf.options
  const path = arg ? undefined : packageJson.find(process.cwd())
  const name =
    arg ? Spec.parseArgs(arg, conf.options).name
    : path ? packageJson.read(dirname(path)).name
    : undefined
  if (!name) {
    throw error(
      'Package name must be given as an argument or in package.json',
      { code: 'EUSAGE' },
    )
  }
  return name
}

/**
 * An uncached request to the registry's `-/package/<name>/trust` routes.
 * The registry is the local package's `publishConfig.registry` when
 * that package is `name`, as for `vlt publish`, else the configured one.
 */
const trustRequest = async (
  conf: LoadedConfig,
  name: string,
  message: string,
  method: 'GET' | 'DELETE' = 'GET',
  id?: string,
): Promise<CacheEntry> => {
  const registry = registryBase(
    localPublishRegistry(conf, name) ?? (await resolveRegistry(conf)),
  )
  const path = `-/package/${name.replace('/', '%2f')}/trust`
  const url = new URL(
    id ? `${path}/${encodeURIComponent(id)}` : path,
    registry,
  )
  let response: CacheEntry
  try {
    response = await new RegistryClient(conf.options).request(url, {
      method,
      useCache: false,
      headers: { 'npm-auth-type': 'web', 'npm-command': 'trust' },
      otp: conf.options.otp,
    })
  } catch (err) {
    throw requestError(err, { message, url, method })
  }
  assertOk(response, { message, url, method })
  return response
}

export const command: CommandFn<CommandResult> = async conf => {
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
  if (sub !== 'revoke') {
    const response = await trustRequest(
      conf,
      name,
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
      name,
      'Failed to revoke trusted publisher',
      'DELETE',
      id,
    )
  }
  return { package: name, id, revoked: !dry }
}
