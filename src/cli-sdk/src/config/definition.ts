import { XDG } from '@vltpkg/xdg'
import { jack } from 'jackspeak'

export const defaultView = process.stdout.isTTY ? 'human' : 'json'

const canonicalCommands = {
  cache: 'cache',
  config: 'config',
  exec: 'exec',
  gui: 'gui',
  help: 'help',
  init: 'init',
  'install-exec': 'install-exec',
  install: 'install',
  login: 'login',
  logout: 'logout',
  list: 'list',
  ls: 'ls',
  pkg: 'pkg',
  query: 'query',
  'run-exec': 'run-exec',
  run: 'run',
  token: 'token',
  uninstall: 'uninstall',
  whoami: 'whoami',
} as const

const aliases = {
  i: 'install',
  add: 'install',
  rm: 'uninstall',
  u: 'uninstall',
  r: 'run',
  'run-script': 'run',
  rx: 'run-exec',
  x: 'exec',
  h: 'help',
  '?': 'help',
  conf: 'config',
  ix: 'install-exec',
  ls: 'list',
} as const

/**
 * Command aliases mapped to their canonical names
 */
export const commands = {
  ...canonicalCommands,
  ...aliases,
} as const

/**
 * Canonical command names mapped to an array of its aliases
 */
export const commandAliases = Object.entries(aliases).reduce(
  (acc, [alias, canonical]) => {
    const commandAliases = acc.get(canonical)
    if (commandAliases) {
      commandAliases.push(alias)
    } else {
      acc.set(canonical, [alias])
    }
    return acc
  },
  new Map<string, string[]>(),
)

export type Commands = typeof commands

export const getCommand = (
  s?: string,
): Commands[keyof Commands] | undefined =>
  s && s in commands ? commands[s as keyof Commands] : undefined

const xdg = new XDG('vlt')
const cacheDir = xdg.cache()

/**
 * Fields that are parsed as a set of key=value pairs
 */
export const recordFields = [
  'git-hosts',
  'registries',
  'git-host-archives',
  'scope-registries',
] as const

export type RecordField = (typeof recordFields)[number]

export const isRecordField = (s: string): s is RecordField =>
  recordFields.includes(s as RecordField)

const stopParsingCommands: Commands[keyof Commands][] = [
  'run',
  'run-exec',
  'exec',
  'install-exec',
]

let stopParsing: boolean | undefined = undefined

const j = jack({
  envPrefix: 'VLT',
  allowPositionals: true,
  usage: `vlt [<options>] [<cmd> [<args> ...]]`,
  stopAtPositionalTest: arg => {
    if (stopParsing) return true
    const a = arg as keyof Commands
    // we stop parsing AFTER the thing, so you can do
    // vlt run --vlt --configs scriptName --args --for --script
    // or
    // vlt exec --vlt --configs command --args --for --command
    if (stopParsingCommands.includes(commands[a])) {
      stopParsing = true
    }
    return false
  },
})
  .heading('vlt')
  .description(
    `More documentation available at <https://docs.vlt.sh>`,
  )
  .heading('Subcommands')

j.description(Object.keys(canonicalCommands).join(', '), {
  pre: true,
}).description(
  'Run `vlt <cmd> --help` for more information about a specific command',
)

export const definition = j
  /**
   * Definition of all configuration values used by vlt.
   */
  .heading('Configuration')
  .description(
    `If a \`vlt.json\` file is present in the root of the current project,
     then that will be used as a source of configuration information.

     Next, the \`vlt.json\` file in the XDG specified config directory
     will be checked, and loaded for any fields not set in the local project.

     Object type values will be merged together. Set a field to \`null\` in
     the JSON configuration to explicitly remove it.

     Command-specific fields may be set in a nested \`command\` object that
     overrides any options defined at the top level.
    `,
  )

  .flag({
    color: {
      short: 'c',
      description: 'Use colors (Default for TTY)',
    },
    'no-color': {
      short: 'C',
      description: 'Do not use colors (Default for non-TTY)',
    },
  })

  .opt({
    registry: {
      hint: 'url',
      default: 'https://registry.npmjs.org/',
      description: `Sets the registry for fetching packages, when no registry
                    is explicitly set on a specifier.

                    For example, \`express@latest\` will be resolved by looking
                    up the metadata from this registry.

                    Note that alias specifiers starting with \`npm:\` will
                    still map to \`https://registry.npmjs.org/\` if this is
                    changed, unless the a new mapping is created via the
                    \`--registries\` option.
      `,
    },
  })

  .optList({
    registries: {
      hint: 'name=url',
      description: `Specify named registry hosts by their prefix. To set the
                    default registry used for non-namespaced specifiers,
                    use the \`--registry\` option.

                    Prefixes can be used as a package alias. For example:

                    \`\`\`
                    vlt --registries loc=http://reg.local install foo@loc:foo@1.x
                    \`\`\`

                    By default, the public npm registry is registered to the
                    \`npm:\` prefix. It is not recommended to change this
                    mapping in most cases.
                    `,
    },

    'scope-registries': {
      hint: '@scope=url',
      description: `Map package name scopes to registry URLs.

                    For example,
                    \`--scope-registries @acme=https://registry.acme/\`
                    would tell vlt to fetch any packages named
                    \`@acme/...\` from the \`https://registry.acme/\`
                    registry.

                    Note: this way of specifying registries is more ambiguous,
                    compared with using the \`--registries\` field and explicit
                    prefixes, because instead of failing when the configuration
                    is absent, it will instead attempt to fetch from the
                    default registry.

                    By comparison, using
                    \`--registries acme=https://registry.acme/\` and then
                    specifying dependencies such as \`"foo": "acme:foo@1.x"\`
                    means that regardless of the name, the package will be
                    fetched from the explicitly named registry, or fail if
                    no registry is defined with that name.

                    However, custom registry aliases are not supported by other
                    package managers.`,
    },

    'git-hosts': {
      hint: `name=template`,
      short: 'G',
      description: `Map a shorthand name to a git remote URL template.

                    The \`template\` may contain placeholders, which will be
                    swapped with the relevant values.

                    \`$1\`, \`$2\`, etc. are replaced with the appropriate
                    n-th path portion. For example, \`github:user/project\`
                    would replace the \`$1\` in the template with \`user\`,
                    and \`$2\` with \`project\`.`,
    },

    'git-host-archives': {
      hint: `name=template`,
      short: 'A',
      description: `Similar to the \`--git-host <name>=<template>\` option,
                    this option can define a template string that will be
                    expanded to provide the URL to download a pre-built
                    tarball of the git repository.

                    In addition to the n-th path portion expansions performed
                    by \`--git-host\`, this field will also expand the
                    string \`$committish\` in the template, replacing it with
                    the resolved git committish value to be fetched.`,
    },
  })

  .opt({
    cache: {
      hint: 'path',
      description: `
        Location of the vlt on-disk cache. Defaults to the platform-specific
        directory recommended by the XDG specification.
      `,
      default: cacheDir,
    },
    tag: {
      description: `Default \`dist-tag\` to install`,
      default: 'latest',
    },
    before: {
      hint: 'date',
      description: `Do not install any packages published after this date`,
    },
    os: {
      description: `The operating system to use as the selector when choosing
                    packages based on their \`os\` value.`,
      default: process.platform,
    },
    arch: {
      description: `CPU architecture to use as the selector when choosing
                    packages based on their \`cpu\` value.`,
      default: process.arch,
    },
    'node-version': {
      hint: 'version',
      description: `Node version to use when choosing packages based on
                    their \`engines.node\` value.`,
      default: process.version,
    },
  })

  .flag({
    'git-shallow': {
      description: `Set to force \`--depth=1\` on all git clone actions.
                    When set explicitly to false with --no-git-shallow,
                    then \`--depth=1\` will not be used.

                    When not set explicitly, \`--depth=1\` will be used for
                    git hosts known to support this behavior.`,
    },
  })
  .num({
    'fetch-retries': {
      hint: 'n',
      description: `Number of retries to perform when encountering network
                    errors or likely-transient errors from git hosts.`,
      default: 3,
    },
    'fetch-retry-factor': {
      hint: 'n',
      description: `The exponential backoff factor to use when retrying
                    requests due to network issues.`,
      default: 2,
    },
    'fetch-retry-mintimeout': {
      hint: 'n',
      description: `Number of milliseconds before starting first retry`,
      default: 0,
    },
    'fetch-retry-maxtimeout': {
      hint: 'n',
      description: `Maximum number of milliseconds between two retries`,
      default: 30_000,
    },
    'stale-while-revalidate-factor': {
      hint: 'n',
      default: 60,
      description: `If the server does not serve a \`stale-while-revalidate\`
                    value in the \`cache-control\` header, then this multiplier
                    is applied to the \`max-age\` or \`s-maxage\` values.

                    By default, this is \`60\`, so for example a response that
                    is cacheable for 5 minutes will allow a stale response
                    while revalidating for up to 5 hours.

                    If the server *does* provide a \`stale-while-revalidate\`
                    value, then that is always used.

                    Set to 0 to prevent any \`stale-while-revalidate\` behavior
                    unless explicitly allowed by the server's \`cache-control\`
                    header.
      `,
    },
  })

  .opt({
    identity: {
      short: 'i',
      validate: (v: unknown) =>
        typeof v === 'string' && /^[a-z0-9]*$/.test(v),
      hint: 'name',
      default: '',
      description: `Provide a string to define an identity for storing auth
                    information when logging into registries.

                    Authentication tokens will be stored in the XDG data
                    directory, in \`vlt/auth/$\{identity}/keychain.json\`.

                    If no identity is provided, then the default \`''\` will
                    be used, storing the file at \`vlt/auth/keychain.json\`.

                    May only contain lowercase alphanumeric characters.
                    `,
    },
  })

  .optList({
    workspace: {
      hint: 'ws',
      short: 'w',
      description: `Set to limit the spaces being worked on when working on
                    workspaces.

                    Can be paths or glob patterns matching paths.

                    Specifying workspaces by package.json name is not
                    supported.`,
    },
    'workspace-group': {
      short: 'g',
      description: `Specify named workspace group names to load and operate on
                    when doing recursive operations on workspaces.`,
    },
  })

  .flag({
    recursive: {
      short: 'r',
      description: `Run an operation across multiple workspaces.

                    No effect when used in non-monorepo projects.

                    Implied by setting --workspace or --workspace-group. If
                    not set, then the action is run on the project root.`,
    },

    bail: {
      short: 'b',
      description: `When running scripts across multiple workspaces, stop
                    on the first failure.`,
      default: true,
    },

    'no-bail': {
      short: 'B',
      description: `When running scripts across multiple workspaces, continue
                    on failure, running the script for all workspaces.`,
    },
  })

  .opt({
    config: {
      hint: 'user | project',
      description: `Specify whether to operate on user-level or project-level
                    configuration files when running \`vlt config\` commands.`,
      validOptions: ['user', 'project'] as const,
      default: 'project',
    },

    editor: {
      hint: 'program',
      description: `The blocking editor to use for \`vlt config edit\` and
                    any other cases where a file should be opened for
                    editing.

                    Defaults to the \`EDITOR\` or \`VISUAL\` env if set, or
                    \`notepad.exe\` on Windows, or \`vi\` elsewhere.`,
      default:
        process.env.EDITOR ||
        process.env.VISUAL ||
        (process.platform === 'win32' ?
          `${process.env.SYSTEMROOT}\\notepad.exe`
        : 'vi'),
    },

    'script-shell': {
      hint: 'program',
      description: `The shell to use when executing \`package.json#scripts\`
                    (either as lifecycle scripts or explicitly with
                    \`vlt run\`) and \`vlt exec\`.

                    If not set, defaults to \`/bin/sh\` on POSIX systems,
                    and \`cmd.exe\` on Windows.

                    When no argument is provided to \`vlt exec\`, the \`SHELL\`
                    environment variable takes precedence if set.`,
    },

    'fallback-command': {
      hint: 'command',
      description: `The command to run when the first argument doesn't
                    match any known commands.

                    For pnpm-style behavior, set this to 'run-exec'. e.g:
                    \`\`\`
                    vlt config set fallback-command=run-exec
                    \`\`\``,
      default: 'help',
      validOptions: Object.keys(canonicalCommands),
    },
  })

  .opt({
    package: {
      hint: 'p',
      description: `When running \`vlt install-exec\`, this allows you to
                    explicitly set the package to search for bins. If not
                    provided, then vlt will interpret the first argument as
                    the package, and attempt to run the default executable.`,
    },
  })

  .opt({
    view: {
      hint: 'output',
      default: defaultView,
      description: `Configures the output format for commands.

                    Defaults to \`human\` if stdout is a TTY, or \`json\`
                    if it is not.

                    - human: Maximally ergonomic output reporting for human
                      consumption.
                    - json: Parseable JSON output for machines.
                    - inspect: Output results with \`util.inspect\`.
                    - gui: Start a local web server and opens a browser to
                      explore the results. (Only relevant for certain
                      commands.)
                    - mermaid: Output mermaid diagramming syntax. (Only
                      relevant for certain commands.)

                    If the requested view format is not supported for the
                    current command, or if no option is provided, then it
                    will fall back to the default.
      `,
      validOptions: [
        'human',
        'json',
        'mermaid',
        'gui',
        'inspect',
      ] as const,
    },
  })

  .optList({
    'dashboard-root': {
      hint: 'path',
      description: `The root directory to use for the dashboard GUI.
                    If not set, the user home directory is used.`,
    },
  })

  .flag({
    'save-dev': {
      short: 'D',
      description: `Save installed packages to a package.json file as
                    devDependencies`,
    },
    'save-optional': {
      short: 'O',
      description: `Save installed packages to a package.json file as
                    optionalDependencies`,
    },
    'save-peer': {
      description: `Save installed packages to a package.json file as
                    peerDependencies`,
    },
    'save-prod': {
      short: 'P',
      description: `Save installed packages into dependencies specifically.
                    This is useful if a package already exists in
                    devDependencies or optionalDependencies, but you want to
                    move it to be a non-optional production dependency.`,
    },
  })

  .flag({
    version: {
      short: 'v',
      description: 'Print the version',
    },
  })

  .flag({
    help: {
      short: 'h',
      description: 'Print helpful information',
    },
  })
