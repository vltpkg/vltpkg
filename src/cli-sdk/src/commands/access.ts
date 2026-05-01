import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import type { LoadedConfig } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'access',
    usage: '<command> [<args>]',
    description: `Set or get access levels for published packages
                  and manage team-based package permissions.`,
    subcommands: {
      'list packages': {
        usage: '[<scope|user|org>]',
        description:
          'List packages with access info for a scope, user, or org.',
      },
      'get status': {
        usage: '<package>',
        description: 'Get the access/visibility status of a package.',
      },
      'set status': {
        usage: '<package>',
        description: `Set the access/visibility of a package. Use --access to specify the level.`,
      },
      grant: {
        usage: '<read-only|read-write> <scope:team> [<package>]',
        description: 'Grant access to a scope:team for a package.',
      },
      revoke: {
        usage: '<scope:team> [<package>]',
        description: 'Revoke access from a scope:team for a package.',
      },
    },
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to manage access on.',
      },
      otp: {
        description: 'Provide an OTP for access changes.',
        value: '<otp>',
      },
    },
  })

export type AccessResult =
  | { package: string; access: string }
  | { packages: Record<string, string> }
  | { granted: { team: string; permissions: string } }
  | { revoked: { team: string } }

export const views = {
  human: (result: AccessResult) => {
    if ('packages' in result) {
      const entries = Object.entries(result.packages)
      if (entries.length === 0) return 'No packages found.'
      return entries
        .map(([name, access]) => `${name}: ${access}`)
        .join('\n')
    }
    if ('granted' in result) {
      return `Granted ${result.granted.permissions} access to ${result.granted.team}.`
    }
    if ('revoked' in result) {
      return `Revoked access from ${result.revoked.team}.`
    }
    return `${result.package}: ${result.access}`
  },
  json: (r: AccessResult) => r,
} as const satisfies Views<AccessResult>

export const command: CommandFn<AccessResult> = async conf => {
  const [sub, ...args] = conf.positionals
  switch (sub) {
    case 'list':
      return listPackages(conf, args)
    case 'get':
      return getStatus(conf, args)
    case 'set':
      return setStatus(conf, args)
    case 'grant':
      return grant(conf, args)
    case 'revoke':
      return revoke(conf, args)
    default: {
      throw error('Invalid access subcommand', {
        found: sub,
        validOptions: ['list', 'get', 'set', 'grant', 'revoke'],
        code: 'EUSAGE',
      })
    }
  }
}

const encodePkgName = (name: string) =>
  name.startsWith('@') ?
    `@${encodeURIComponent(name.slice(1))}`
  : encodeURIComponent(name)

const listPackages = async (
  conf: LoadedConfig,
  args: string[],
): Promise<AccessResult> => {
  const [keyword, entity] = args
  if (keyword !== 'packages') {
    throw error('Expected `list packages [<scope|user|org>]`', {
      found: keyword,
      code: 'EUSAGE',
    })
  }
  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)

  // Determine who to list for — use entity arg or fall back to scope from package.json
  const scope = entity ?? getDefaultScope(conf)

  const url = new URL(
    `-/org/${encodeURIComponent(scope)}/package`,
    registryUrl,
  )
  const response = await rc.request(url, { useCache: false })
  const data = response.json() as Record<string, string>
  return { packages: data }
}

const getStatus = async (
  conf: LoadedConfig,
  args: string[],
): Promise<AccessResult> => {
  const [keyword, pkg] = args
  if (keyword !== 'status') {
    throw error('Expected `get status <package>`', {
      found: keyword,
      code: 'EUSAGE',
    })
  }
  if (!pkg) {
    throw error('Package name is required for `get status`', {
      code: 'EUSAGE',
    })
  }
  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)
  const url = new URL(
    `-/package/${encodePkgName(pkg)}/access`,
    registryUrl,
  )
  const response = await rc.request(url, { useCache: false })
  const data = response.json() as { access: string }
  return { package: pkg, access: data.access }
}

const setStatus = async (
  conf: LoadedConfig,
  args: string[],
): Promise<AccessResult> => {
  // vlt access set status=<public|restricted> <package>
  const [statusArg, pkg] = args
  if (!statusArg?.startsWith('status=')) {
    throw error(
      'Expected `set status=<public|restricted> <package>`',
      { found: statusArg, code: 'EUSAGE' },
    )
  }
  const accessLevel = statusArg.slice('status='.length)
  if (accessLevel !== 'public' && accessLevel !== 'restricted') {
    throw error('Access level must be `public` or `restricted`', {
      found: accessLevel,
      validOptions: ['public', 'restricted'],
      code: 'EUSAGE',
    })
  }
  if (!pkg) {
    throw error('Package name is required for `set status`', {
      code: 'EUSAGE',
    })
  }
  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)
  const url = new URL(
    `-/package/${encodePkgName(pkg)}/access`,
    registryUrl,
  )
  await rc.request(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ access: accessLevel }),
    otp: conf.options.otp,
    useCache: false,
  })
  return { package: pkg, access: accessLevel }
}

const grant = async (
  conf: LoadedConfig,
  args: string[],
): Promise<AccessResult> => {
  // vlt access grant <read-only|read-write> <scope:team> [<package>]
  const [permissions, scopeTeam, pkg] = args
  if (permissions !== 'read-only' && permissions !== 'read-write') {
    throw error('Permissions must be `read-only` or `read-write`', {
      found: permissions,
      validOptions: ['read-only', 'read-write'],
      code: 'EUSAGE',
    })
  }
  if (!scopeTeam?.includes(':')) {
    throw error('Team must be in the format `<scope>:<team>`', {
      found: scopeTeam,
      code: 'EUSAGE',
    })
  }
  const [scope, team] = scopeTeam.split(':')
  if (!scope || !team) {
    throw error('Team must be in the format `<scope>:<team>`', {
      found: scopeTeam,
      code: 'EUSAGE',
    })
  }

  const pkgName = pkg ?? getDefaultPkgName(conf)

  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)
  const url = new URL(
    `-/team/${encodeURIComponent(scope)}/${encodeURIComponent(team)}/package`,
    registryUrl,
  )
  await rc.request(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      package: pkgName,
      permissions,
    }),
    otp: conf.options.otp,
    useCache: false,
  })
  return {
    granted: {
      team: `${scope}:${team}`,
      permissions,
    },
  }
}

const revoke = async (
  conf: LoadedConfig,
  args: string[],
): Promise<AccessResult> => {
  // vlt access revoke <scope:team> [<package>]
  const [scopeTeam, pkg] = args
  if (!scopeTeam?.includes(':')) {
    throw error('Team must be in the format `<scope>:<team>`', {
      found: scopeTeam,
      code: 'EUSAGE',
    })
  }
  const [scope, team] = scopeTeam.split(':')
  if (!scope || !team) {
    throw error('Team must be in the format `<scope>:<team>`', {
      found: scopeTeam,
      code: 'EUSAGE',
    })
  }

  const pkgName = pkg ?? getDefaultPkgName(conf)

  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)
  const url = new URL(
    `-/team/${encodeURIComponent(scope)}/${encodeURIComponent(team)}/package`,
    registryUrl,
  )
  await rc.request(url, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ package: pkgName }),
    otp: conf.options.otp,
    useCache: false,
  })
  return {
    revoked: {
      team: `${scope}:${team}`,
    },
  }
}

const getDefaultScope = (conf: LoadedConfig): string => {
  const name = conf.options.packageJson.maybeRead(
    conf.projectRoot,
  )?.name
  if (name?.startsWith('@')) {
    const scope = name.split('/')[0]
    if (scope) return scope
  }
  throw error(
    'Could not determine scope. Provide a scope, user, or org.',
    { code: 'EUSAGE' },
  )
}

const getDefaultPkgName = (conf: LoadedConfig): string => {
  const name = conf.options.packageJson.maybeRead(
    conf.projectRoot,
  )?.name
  if (name) return name
  throw error(
    'Could not determine package name. Provide a package name or run from a package directory.',
    { code: 'EUSAGE' },
  )
}
