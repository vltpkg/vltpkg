import { PackageJson } from '@vltpkg/package-json'
import * as RC from '@vltpkg/registry-client'
import { styleText } from 'node:util'
import t from 'tap'
import type { Test } from 'tap'
import type { CommandResult } from '../../src/commands/trust.ts'
import type { LoadedConfig } from '../../src/config/index.ts'
import * as Output from '../../src/output.ts'

type Sent = {
  url: string
  method?: string
  useCache?: boolean
  headers?: Record<string, string>
  otp?: string
  body?: string
}
type Reply = {
  statusCode: number
  json?: () => unknown
  text?: () => string
}
const sent: Sent[] = []
let reply: (url: string) => Reply
// scripted prompt
let tty: boolean
let answer: boolean | undefined
const questions: string[] = []
// whether stderr supports colors
let stderrColors = false

const Trust = await t.mockImport<
  typeof import('../../src/commands/trust.ts')
>('../../src/commands/trust.ts', {
  '@vltpkg/registry-client': {
    ...RC,
    RegistryClient: class {
      async request(
        url: URL,
        { method, useCache, headers, otp, body }: Omit<Sent, 'url'>,
      ) {
        sent.push({
          url: String(url),
          method,
          useCache,
          headers,
          otp,
          ...(body !== undefined && { body }),
        })
        return reply(String(url))
      }
    },
  },
  '../../src/skills-prompt.ts': {
    interactive: () => tty,
    confirm: async (q: string) => {
      questions.push(q)
      return answer
    },
  },
  '../../src/output.ts': {
    ...Output,
    styleTextStderr: (
      format: Parameters<typeof styleText>[0],
      s: string,
    ) =>
      stderrColors ?
        styleText(format, s, { validateStream: false })
      : s,
  },
})

const REG = 'https://r.example/acme/main/'
const ID = '3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b'
const headers = { 'npm-auth-type': 'web', 'npm-command': 'trust' }
const noPackageJson = { find: () => undefined }

const mkConf = (
  positionals: string[],
  options: Record<string, unknown> = {},
) =>
  ({
    positionals,
    options: {
      registry: REG,
      registries: {},
      packageJson: noPackageJson,
      ...options,
    },
  }) as unknown as LoadedConfig

const item = {
  type: 'github',
  id: ID,
  file: 'release.yml',
  repository: 'acme/utils',
  environment: 'production',
  permissions: ['createPackage', 'createStagedPackage'],
}

// `vlt trust github @acme/utils` with every option: what it sends,
// and the registry's answer, which adds the id
const PKG = '@acme/utils'
const all = {
  file: 'release.yml',
  repository: 'acme/utils',
  environment: 'production',
  'allow-publish': true,
  'allow-stage-publish': true,
}
const BODY =
  '[{"type":"github","claims":{"repository":"acme/utils","workflow_ref":{"file":"release.yml"},"environment":"production"},"permissions":["createPackage","createStagedPackage"]}]'
const created = () => ({
  statusCode: 201,
  json: () =>
    (JSON.parse(BODY) as object[]).map(c => ({ id: ID, ...c })),
})
// a dry run: the registry assigns the id
const { id: _, ...noId } = item
const noRepository =
  'Repository must be given with --repository or the repository field of package.json'

t.beforeEach(() => {
  sent.length = 0
  questions.length = 0
  tty = false
  answer = undefined
  stderrColors = false
  reply = () => ({ statusCode: 200, json: () => [] })
})

t.test('usage', async t => {
  t.matchSnapshot(Trust.usage().usage())
})

t.test('views', async t => {
  const { json } = Trust.views
  const human = (result: CommandResult, options = {}) =>
    Trust.views.human(result, {}, mkConf([], options))
  t.matchSnapshot(human([]), 'none')
  t.matchSnapshot(human([item]), 'list one')
  t.matchSnapshot(
    human([
      item,
      { type: 'github', file: 'ci.yaml', permissions: ['other'] },
      { id: ID },
    ]),
    'list',
  )
  const revoked = { package: '@acme/pkg', id: ID, revoked: true }
  t.matchSnapshot(human(revoked), 'revoked')
  t.matchSnapshot(human({ ...revoked, revoked: false }), 'dry run')
  t.equal(json(revoked), revoked)
  t.matchSnapshot(human({ package: PKG, ...item }), 'created')
  t.matchSnapshot(
    human({ package: PKG, ...noId }, { 'dry-run': true }),
    'created dry run',
  )
})

t.test('human views use the vlt stage colors', async t => {
  const bold = (s: string) => `\x1b[1m${s}\x1b[22m`
  const key = (k: string) => bold(`${k}:`)
  const id = `${key('id')} \x1b[33m${ID}\x1b[39m`
  const human = (result: CommandResult, options = {}) =>
    Trust.views.human(result, { colors: true }, mkConf([], options))
  t.equal(
    human({ package: PKG, ...item }),
    [
      '',
      `\x1b[0m🤝 ${bold('Trusted publisher created for @acme/utils:')}`,
      `${key('type')} github`,
      id,
      `${key('file')} release.yml`,
      `${key('repository')} acme/utils`,
      `${key('environment')} production`,
      `${key('permissions')} publish, stage publish\x1b[0m`,
    ].join('\n'),
    'blank line, bold title and keys, highlighted id, reset',
  )
  t.equal(
    human({ package: PKG, ...noId }, { 'dry-run': true }).split(
      '\n',
    )[1],
    `\x1b[0m🤲 ${bold('Would create this trusted publisher for @acme/utils (dry run):')}`,
  )
  t.equal(
    human([item, { ...item, id: 'b' }]),
    [
      `\x1b[0m├─ 🤝 ${id}`,
      `│    ${key('type')} github`,
      `│    ${key('file')} release.yml`,
      `│    ${key('repository')} acme/utils`,
      `│    ${key('environment')} production`,
      `│    ${key('permissions')} publish, stage publish`,
      '│',
      `└─ 🤝 ${key('id')} \x1b[33mb\x1b[39m`,
      `     ${key('type')} github`,
      `     ${key('file')} release.yml`,
      `     ${key('repository')} acme/utils`,
      `     ${key('environment')} production`,
      `     ${key('permissions')} publish, stage publish\x1b[0m`,
    ].join('\n'),
    'list: a tree like vlt stage list, bold keys, highlighted id, reset',
  )
  for (const result of [[item], { package: PKG, ...item }]) {
    t.notMatch(
      Trust.views.human(result, {}, mkConf([])),
      '\x1b',
      'no colors',
    )
  }

  const errs = t.capture(console, 'error').args
  tty = true
  answer = false
  stderrColors = true
  const { exitCode } = process
  t.teardown(() => {
    process.exitCode = exitCode
  })
  await Trust.command(mkConf(['github', PKG], all))
  const [[summary]] = errs() as [[string]]
  t.equal(
    summary.split('\n').slice(0, 4).join('\n'),
    [
      '',
      `\x1b[0m🤲 ${bold('Establishing trust between @acme/utils and GitHub Actions.')}`,
      'Anyone with write access to acme/utils can publish and stage publish @acme/utils.',
      `${key('type')} github`,
    ].join('\n'),
    'the question is introduced like the result',
  )
  t.match(summary, /\x1b\[0m$/)
})

t.test('a subcommand is required', async t => {
  const validOptions = ['github', 'list', 'ls', 'revoke']
  await t.rejects(Trust.command(mkConf([])), {
    message: 'trust command requires a subcommand',
    cause: { code: 'EUSAGE', validOptions },
  })
  await t.rejects(Trust.command(mkConf(['frobnicate', 'foo'])), {
    message: 'Invalid trust subcommand',
    cause: { code: 'EUSAGE', found: 'frobnicate', validOptions },
  })
  t.strictSame(sent, [])
})

t.test('list', async t => {
  reply = () => ({
    statusCode: 200,
    json: () => [
      {
        id: ID,
        type: 'github',
        claims: {
          repository: 'acme/utils',
          workflow_ref: { file: 'release.yml' },
          environment: 'production',
        },
        permissions: ['createPackage', 'createStagedPackage'],
      },
      { type: 'github', claims: {} },
      {},
    ],
  })
  const items = await Trust.command(mkConf(['list', '@acme/pkg']))
  t.strictSame(items, [item, { type: 'github' }, {}])
  t.strictSame(
    Object.keys((items as object[])[0] ?? {}),
    Object.keys(item),
    'npm order',
  )
  t.strictSame(sent, [
    {
      url: `${REG}-/package/@acme%2fpkg/trust`,
      method: 'GET',
      useCache: false,
      headers,
      otp: undefined,
    },
  ])
  await Trust.command(mkConf(['ls', 'foo@1']))
  t.equal(
    sent.at(-1)?.url,
    `${REG}-/package/foo/trust`,
    'ls is an alias, a version is ignored',
  )
})

t.test('revoke', async t => {
  reply = () => ({ statusCode: 204 })
  t.strictSame(
    await Trust.command(
      mkConf(['revoke', '@acme/pkg'], { id: 'a/b', otp: '123456' }),
    ),
    { package: '@acme/pkg', id: 'a/b', revoked: true },
  )
  t.strictSame(sent, [
    {
      url: `${REG}-/package/@acme%2fpkg/trust/a%2Fb`,
      method: 'DELETE',
      useCache: false,
      headers,
      otp: '123456',
    },
  ])
})

// no registry configured: arguments are checked before it is resolved
t.test('arguments', async t => {
  const noRegistry = { registry: undefined }
  t.strictSame(
    await Trust.command(
      mkConf(['revoke', 'foo'], {
        ...noRegistry,
        id: ID,
        'dry-run': true,
      }),
    ),
    { package: 'foo', id: ID, revoked: false },
    'a dry run sends nothing',
  )
  for (const sub of ['github', 'list', 'revoke']) {
    await t.rejects(Trust.command(mkConf([sub], noRegistry)), {
      message:
        'Package name must be given as an argument or in package.json',
      cause: { code: 'EUSAGE' },
    })
  }
  await t.rejects(
    Trust.command(mkConf(['revoke', 'foo'], noRegistry)),
    {
      message:
        'Id of the trusted publisher to revoke must be given with --id',
      cause: { code: 'EUSAGE' },
    },
  )
  t.strictSame(sent, [])
})

t.test('registry errors', async t => {
  reply = () => ({ statusCode: 404, text: () => 'Not found' })
  await t.rejects(
    Trust.command(mkConf(['revoke', 'foo'], { id: ID })),
    {
      message: /^Failed to revoke trusted publisher: 404/,
      cause: { code: 'EREQUEST', status: 404, method: 'DELETE' },
    },
  )
  reply = () => ({ statusCode: 409, text: () => 'Already trusted' })
  await t.rejects(
    Trust.command(mkConf(['github', PKG], { ...all, yes: true })),
    {
      message: /^Failed to create trusted publisher: 409/,
      cause: { code: 'EREQUEST', status: 409, method: 'POST' },
    },
  )
  reply = () => {
    throw new Error('socket hang up')
  }
  await t.rejects(Trust.command(mkConf(['list', 'foo'])), {
    message: 'Failed to list trusted publishers: socket hang up',
  })
})

t.test('github', async t => {
  const errs = t.capture(console, 'error').args
  reply = created
  const result = await Trust.command(
    mkConf(['github', PKG], { ...all, yes: true, otp: '123456' }),
  )
  t.strictSame(result, { package: PKG, ...item })
  t.strictSame(Object.keys(result ?? {}), [
    'package',
    ...Object.keys(item),
  ])
  t.strictSame(sent, [
    {
      url: `${REG}-/package/@acme%2futils/trust`,
      method: 'POST',
      useCache: false,
      headers: { ...headers, 'content-type': 'application/json' },
      otp: '123456',
      body: BODY,
    },
  ])
  t.strictSame(questions, [], '--yes does not ask')
  t.strictSame(errs(), [])
})

t.test('github aliases', async t => {
  reply = created
  const body = async (options: Record<string, unknown>) => {
    await Trust.command(
      mkConf(['github', 'foo'], {
        file: 'ci.yaml',
        yes: true,
        ...options,
      }),
    )
    return sent.at(-1)?.body
  }
  t.equal(
    await body({ repo: 'o/r', 'allow-staged-publish': true }),
    '[{"type":"github","claims":{"repository":"o/r","workflow_ref":{"file":"ci.yaml"}},"permissions":["createStagedPackage"]}]',
  )
  t.equal(
    await body({
      repo: 'o/r',
      repository: 'acme/utils',
      'allow-publish': true,
    }),
    '[{"type":"github","claims":{"repository":"acme/utils","workflow_ref":{"file":"ci.yaml"}},"permissions":["createPackage"]}]',
    'repository wins over repo',
  )
})

// no registry configured, no --yes, no terminal: none is needed yet
t.test('github arguments', async t => {
  const errs = t.capture(console, 'error').args
  const github = (options: Record<string, unknown>) =>
    Trust.command(
      mkConf(['github', PKG], {
        registry: undefined,
        ...all,
        ...options,
      }),
    )
  const usage = (message: string, found?: string) => ({
    message,
    cause: { code: 'EUSAGE', ...(found && { found }) },
  })
  await t.rejects(
    github({ 'allow-publish': false, 'allow-stage-publish': false }),
    usage(
      'At least one of --allow-publish and --allow-stage-publish is required',
    ),
  )
  await t.rejects(
    github({ file: undefined }),
    usage('Workflow file must be given with --file'),
  )
  for (const file of [
    'release.txt',
    '.github/workflows/release.yml',
  ]) {
    await t.rejects(
      github({ file }),
      usage(
        'Workflow file must be a file name ending in .yml or .yaml, not a path',
        file,
      ),
    )
  }
  await t.rejects(
    github({ repository: undefined }),
    usage(noRepository),
  )
  for (const repository of ['acme', 'a/b/c']) {
    await t.rejects(
      github({ repository }),
      usage(
        'Repository must be in the format owner/repo',
        repository,
      ),
    )
  }
  t.strictSame(
    await github({ 'dry-run': true }),
    { package: PKG, ...noId },
    'a dry run has no id',
  )
  await t.rejects(
    github({}),
    usage(
      'Not a terminal: pass --yes to create the trusted publisher',
    ),
  )
  t.strictSame(sent, [])
  t.strictSame(questions, [])
  t.strictSame(errs(), [])
})

t.test('github asks before sending', async t => {
  const { exitCode } = process
  t.teardown(() => {
    process.exitCode = exitCode
  })
  const errs = t.capture(console, 'error').args
  const summary = [
    '',
    '🤲 Establishing trust between @acme/utils and GitHub Actions.',
    'Anyone with write access to acme/utils can publish and stage publish @acme/utils.',
    'type: github',
    'file: release.yml',
    'repository: acme/utils',
    'environment: production',
    'permissions: publish, stage publish',
  ].join('\n')
  tty = true
  reply = created

  await t.rejects(
    Trust.command(
      mkConf(['github', PKG], { ...all, registry: undefined }),
    ),
    { cause: { code: 'ECONFIG' } },
    'the registry is resolved first',
  )
  t.strictSame(questions, [])
  t.strictSame(errs(), [])

  answer = true
  t.strictSame(await Trust.command(mkConf(['github', PKG], all)), {
    package: PKG,
    ...item,
  })
  t.strictSame(errs(), [[summary]])
  t.strictSame(questions, ['Do you want to proceed? (y/N) '])
  t.equal(sent.at(-1)?.body, BODY)

  // declined, then input closed
  for (const no of [false, undefined]) {
    answer = no
    sent.length = 0
    process.exitCode = 0
    t.equal(
      await Trust.command(mkConf(['github', PKG], all)),
      undefined,
    )
    t.equal(process.exitCode, 1)
    t.strictSame(errs(), [
      [summary],
      ['Cancelled: no trusted publisher was created.'],
    ])
    t.strictSame(sent, [])
  }
})

t.test('the package in the current directory', async t => {
  const local = (t: Test, manifest: Record<string, unknown>) => {
    t.chdir(
      t.testdir({
        'package.json': JSON.stringify({
          version: '1.0.0',
          publishConfig: { registry: 'https://p.example/acme/pub' },
          ...manifest,
        }),
      }),
    )
    return new PackageJson()
  }
  const listUrl = (conf: LoadedConfig) =>
    Trust.command(conf).then(() => sent.at(-1)?.url)

  t.test('its name and publishConfig.registry', async t => {
    const packageJson = local(t, { name: '@acme/pkg' })
    t.equal(
      await listUrl(
        mkConf(['list'], { packageJson, registry: undefined }),
      ),
      'https://p.example/acme/pub/-/package/@acme%2fpkg/trust',
    )
  })

  t.test('another package uses the configured registry', async t => {
    const packageJson = local(t, { name: '@acme/pkg' })
    t.equal(
      await listUrl(mkConf(['list', 'other'], { packageJson })),
      `${REG}-/package/other/trust`,
    )
  })

  t.test('no name', async t => {
    const packageJson = local(t, {})
    await t.rejects(
      Trust.command(mkConf(['list'], { packageJson })),
      {
        message:
          'Package name must be given as an argument or in package.json',
        cause: { code: 'EUSAGE' },
      },
    )
    t.strictSame(sent, [])
  })

  const REPO = 'git+https://github.com/acme/utils.git'
  const github = (
    packageJson: PackageJson,
    positionals = ['github', PKG],
  ) =>
    Trust.command(
      mkConf(positionals, {
        packageJson,
        registry: undefined,
        file: 'release.yml',
        'allow-publish': true,
        yes: true,
      }),
    )

  t.test('github: its name, repository and registry', async t => {
    reply = created
    await github(local(t, { name: PKG, repository: REPO }), [
      'github',
    ])
    t.strictSame(
      sent.map(s => [s.url, s.body]),
      [
        [
          'https://p.example/acme/pub/-/package/@acme%2futils/trust',
          '[{"type":"github","claims":{"repository":"acme/utils","workflow_ref":{"file":"release.yml"}},"permissions":["createPackage"]}]',
        ],
      ],
    )
  })

  t.test('github: repository as an object', async t => {
    reply = created
    await github(
      local(t, { name: PKG, repository: { type: 'git', url: REPO } }),
    )
    t.match(sent.at(-1)?.body, '"repository":"acme/utils"')
  })

  for (const [title, manifest] of Object.entries({
    'not on GitHub': {
      name: PKG,
      repository: 'https://gitlab.com/acme/utils.git',
    },
    'not set': { name: PKG },
    'of another package': { name: 'other', repository: REPO },
  })) {
    t.test(`github: repository ${title}`, async t => {
      await t.rejects(github(local(t, manifest)), {
        message: noRepository,
        cause: { code: 'EUSAGE' },
      })
      t.strictSame(sent, [])
    })
  }

  t.test('no registry anywhere', async t => {
    const packageJson = local(t, {
      name: 'pkg',
      publishConfig: undefined,
    })
    await t.rejects(
      Trust.command(
        mkConf(['list'], { packageJson, registry: undefined }),
      ),
      {
        message: /^Missing registry configuration/,
        cause: { code: 'ECONFIG' },
      },
    )
    t.strictSame(sent, [])
  })
})
