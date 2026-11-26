import { error } from '@vltpkg/error-cause'
import {
  RegistryClient,
  assertOk,
  registryBase,
  requestError,
} from '@vltpkg/registry-client'
import type { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { storeLayout } from '@vltpkg/tar/unpack'
import { writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { styleText } from 'node:util'
import { commandUsage } from '../config/usage.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { localPublishRegistry } from '../publish-config.ts'
import { resolveRegistry } from '../require-registry.ts'
import type { ViewOptions, Views } from '../view.ts'
import { publish, views as publishViews } from './publish.ts'
import type { CommandResult as PublishResult } from './publish.ts'

const subcommands = [
  'publish',
  'list',
  'ls',
  'view',
  'approve',
  'reject',
  'download',
]

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'stage',
    usage: [
      'publish',
      'list [<pkg>]',
      'view <stage-id>',
      'approve <stage-id>',
      'reject <stage-id>',
      'download <stage-id>',
    ],
    description: `Stage a package version for a person to approve.

    A staged version is uploaded to the registry but not served until
    a person approves it with a second factor. Staging never asks for
    one, so a CI workflow can stage and a maintainer approves. Approving
    publishes the version, rejecting deletes it.

    The registry must support staged publishing. Every subcommand uses
    the \`publishConfig.registry\` of the package in the current
    directory if set, else the configured registry.`,
    subcommands: {
      publish: {
        description:
          'Pack and stage the package. Takes the same options as `vlt publish`.',
      },
      list: {
        usage: '[<pkg>]',
        description:
          'List the staged versions in the registry, or those of one package. Alias: `ls`.',
      },
      view: {
        usage: '<stage-id>',
        description: 'Show a staged version.',
      },
      approve: {
        usage: '<stage-id>',
        description:
          'Publish a staged version. Needs a second factor.',
      },
      reject: {
        usage: '<stage-id>',
        description:
          'Delete a staged version and its tarball. Needs a second factor.',
      },
      download: {
        usage: '<stage-id>',
        description:
          'Save the staged tarball in the current directory.',
      },
    },
    options: {
      otp: {
        value: '<otp>',
        description:
          'One-time password to approve or reject a staged version with.',
      },
    },
  })

/** A staged version as the registry describes it. */
export type StageItem = {
  id: string
  packageName: string
  version: string
  status?: string
  tag?: string
  createdAt?: string
  actor?: string | null
  actorType?: string
  shasum?: string | null
  [key: string]: unknown
}

export type StageDecision = {
  id: string
  action: 'approved' | 'rejected'
}

export type StageDownload = { id: string; file: string }

export type CommandResult =
  | PublishResult
  | StageItem
  | StageItem[]
  | StageDecision
  | StageDownload

const isItem = (r: object): r is StageItem => 'packageName' in r

type Style = (s: string) => string

// colors as `vlt ls`: the id is highlighted like a selected package
const styles = ({ colors }: ViewOptions) => {
  const style =
    (format: 'bold' | 'reset' | 'yellow'): Style =>
    s =>
      colors ? styleText(format, s, { validateStream: false }) : s
  return {
    bold: style('bold'),
    reset: style('reset'),
    yellow: style('yellow'),
  }
}

/** The fields npm prints, in its order, then the others. */
const itemLines = (
  {
    id,
    packageName,
    version,
    status,
    tag,
    createdAt,
    actor,
    actorType,
    shasum,
    ...rest
  }: StageItem,
  { bold, yellow }: Record<'bold' | 'yellow', Style>,
): string[] => [
  `📥 ${bold('id:')} ${yellow(id)}`,
  ...Object.entries({
    'package name': packageName,
    version,
    status,
    tag,
    'date staged': createdAt,
    'staged by':
      actor && actorType ? `${actor} (${actorType})` : actor,
    shasum,
    ...rest,
  })
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${bold(`${k}:`)} ${String(v)}`),
]

/** One branch per staged version, drawn like `vlt ls`. */
const itemTree = (items: StageItem[], s: ReturnType<typeof styles>) =>
  items
    .flatMap((item, i) => {
      const last = i === items.length - 1
      const [first, ...rest] = itemLines(item, s)
      return [
        `${last ? '└─' : '├─'} ${first}`,
        ...rest.map(line => `${last ? ' ' : '│'}    ${line}`),
        ...(last ? [] : ['│']),
      ]
    })
    .join('\n')

export const views = {
  human: (result, options: ViewOptions = {}) => {
    const s = styles(options)
    if (Array.isArray(result)) {
      const [first] = result
      if (!first) return 'No staged packages found.'
      return isItem(first) ?
          s.reset(itemTree(result as StageItem[], s))
        : publishViews.human(result as PublishResult)
    }
    if (isItem(result))
      return s.reset(itemLines(result, s).join('\n'))
    if ('action' in result) {
      const id = s.yellow(result.id)
      return s.reset(
        result.action === 'approved' ?
          `Staged package ${id} approved and published successfully.`
        : `Staged package ${id} has been rejected.`,
      )
    }
    if ('file' in result) return result.file
    return publishViews.human(result)
  },
  json: r => r,
} as const satisfies Views<CommandResult>

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const stageId = (sub: string, id: string | undefined): string => {
  if (!id) {
    throw error(`stage ${sub} requires a <stage-id>`, {
      code: 'EUSAGE',
    })
  }
  if (!UUID.test(id)) {
    throw error('stage-id must be a valid UUID', {
      code: 'EUSAGE',
      found: id,
    })
  }
  return id
}

/** `list <pkg>` filters by name; a version is refused, as npm does. */
const packageFilter = (
  conf: LoadedConfig,
  pkg: string | undefined,
): string | undefined => {
  if (!pkg) return undefined
  const { name, bareSpec } = Spec.parseArgs(pkg, conf.options)
  if (bareSpec && bareSpec !== '*') {
    throw error(
      'Version specifiers are not supported for listing staged packages',
      { code: 'EUSAGE', found: pkg },
    )
  }
  return name
}

/**
 * Uncached requests to the registry's `-/stage` routes. The registry is
 * the local package's `publishConfig.registry`, as for `vlt stage
 * publish`, else the configured one.
 */
const stageClient = async (conf: LoadedConfig) => {
  const registry = registryBase(
    localPublishRegistry(conf) ?? (await resolveRegistry(conf)),
  )
  const rc = new RegistryClient(conf.options)
  return async (
    path: string,
    message: string,
    {
      method = 'GET',
      otp,
    }: { method?: 'GET' | 'POST' | 'DELETE'; otp?: string } = {},
  ): Promise<CacheEntry> => {
    const url = new URL(path, registry)
    let response: CacheEntry
    try {
      response = await rc.request(url, {
        method,
        useCache: false,
        headers: { 'npm-auth-type': 'web', 'npm-command': 'stage' },
        otp,
      })
    } catch (err) {
      throw requestError(err, { message, url, method })
    }
    assertOk(response, { message, url, method })
    return response
  }
}

type StageRequest = Awaited<ReturnType<typeof stageClient>>

const list = async (
  request: StageRequest,
  name: string | undefined,
): Promise<StageItem[]> => {
  const items: StageItem[] = []
  const perPage = 100
  for (let page = 0; ; page++) {
    const query = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    })
    if (name) query.set('package', name)
    const res = (
      await request(
        `-/stage?${query.toString()}`,
        'Failed to list staged packages',
      )
    ).json() as { items: StageItem[]; total: number }
    items.push(...res.items)
    if (items.length >= res.total || res.items.length < perPage) break
  }
  return items
}

/** Save the tarball in the cwd, named from its own package.json. */
const download = (data: Buffer, id: string): StageDownload => {
  const { name, version } = storeLayout(data, process.cwd()).index
  const file =
    name &&
    version &&
    `${name.replace('@', '').replace('/', '-')}-${version}-${id}.tgz`
  if (!file || basename(file) !== file) {
    throw error(
      'Could not read a package name and version from the staged tarball',
      { found: { name, version } },
    )
  }
  writeFileSync(resolve(process.cwd(), file), data)
  return { id, file }
}

export const command: CommandFn<CommandResult> = async conf => {
  const [sub, arg] = conf.positionals
  if (sub === 'publish') return publish(conf, { stage: true })
  // arguments are checked before the registry is resolved or prompted for
  if (sub === 'list' || sub === 'ls') {
    const name = packageFilter(conf, arg)
    return list(await stageClient(conf), name)
  }
  if (!sub || !subcommands.includes(sub)) {
    throw error(
      sub ?
        'Invalid stage subcommand'
      : 'stage command requires a subcommand',
      { code: 'EUSAGE', found: sub, validOptions: subcommands },
    )
  }
  const id = stageId(sub, arg)
  const request = await stageClient(conf)
  const { otp } = conf.options
  switch (sub) {
    case 'view':
      return (
        await request(
          `-/stage/${id}`,
          'Failed to view staged package',
        )
      ).json() as StageItem
    case 'approve':
      await request(
        `-/stage/${id}/approve`,
        'Failed to approve staged package',
        { method: 'POST', otp },
      )
      return { id, action: 'approved' }
    case 'reject':
      await request(
        `-/stage/${id}`,
        'Failed to reject staged package',
        { method: 'DELETE', otp },
      )
      return { id, action: 'rejected' }
    default:
      return download(
        (
          await request(
            `-/stage/${id}/tarball`,
            'Failed to download staged package',
          )
        ).buffer(),
        id,
      )
  }
}
