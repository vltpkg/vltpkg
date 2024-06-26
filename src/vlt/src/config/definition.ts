import { XDG } from '@vltpkg/xdg'
import { jack } from 'jackspeak'
import { homedir } from 'os'
import { relative, sep } from 'path'

/**
 * Command aliases mapped to their canonical names
 */
export const commands = {
  i: 'install',
  add: 'install',
  install: 'install',
  rm: 'uninstall',
  u: 'uninstall',
  uninstall: 'uninstall',
  r: 'run',
  'run-script': 'run',
  run: 'run',
  rx: 'run-exec',
  'run-exec': 'run-exec',
  x: 'exec',
  exec: 'exec',
  h: 'help',
  '?': 'help',
  help: 'help',
  conf: 'config',
  config: 'config',
  ix: 'install-exec',
  'install-exec': 'install-exec',
} as const

export type Commands = typeof commands

const xdg = new XDG('vlt')
const home = homedir()
const confDir = xdg.config('vlt.json')

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

/**
 * Definition of all configuration values used by vlt.
 */
export const definition = jack({
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
  .heading('vlt - A New Home for JavaScript')
  .description(
    `Here goes a short description of the vlt command line client.

     Much more documentation available at <https://docs.vlt.sh>`,
  )

  .heading('Subcommands')
  // make this one an H3, and wrap in a <pre>
  .heading('vlt install [packages ...]', 3, { pre: true })
  .description(
    `Install the specified packages, updating package.json and vlt-lock.json
     appropriately.`,
  )
  .heading('vlt uninstall [packages ...]', 3, { pre: true })
  .description(
    `The opposite of \`vlt install\`. Removes deps and updates vlt-lock.json
     and package.json appropriately.`,
  )

  .heading('vlt run <script> [args ...]', 3, { pre: true })
  .description(
    `Run a script defined in 'package.json', passing along any extra
    arguments. Note that vlt config values must be specified *before*
    the script name, because everything after that is handed off to
    the script process.`,
  )

  .heading('vlt exec [args ...]', 3, { pre: true })
  .description(
    `Run an arbitrary command, with the local installed packages first in the
     PATH. Ie, this will run your locally installed package bins.

     If no command is provided, then a shell is spawned in the current working
     directory, with the locally installed package bins first in the PATH.

     Note that any vlt configs must be specified *before* the command,
     as the remainder of the command line options are provided to the exec
     process.`,
  )

  .heading('vlt run-exec [args ...]', 3, { pre: true })
  .description(
    `If the first argument is a defined script in package.json, then this is
     equivalent to \`vlt run\`.

     If not, then this is equivalent to \`vlt exec\`.`,
  )

  .heading('vlt config <subcommand>', 3, { pre: true })
  .description('Work with vlt configuration')

  .heading('vlt config get <key>', 4, { pre: true })
  .description('Print the named config value')
  .heading('vlt config list', 4, { pre: true })
  .description('Print all configuration settings currently in effect')
  .heading('vlt config set <key=value> [<key=value> ...]', 4, {
    pre: true,
  })
  .description(
    `Set config values. By default, these are written to the project config
     file, \`vlt.json\` in the root of the project. To set things for all
     projects, run with \`--config=user\``,
  )
  .heading('vlt config del <key> [<key> ...]', 4, { pre: true })
  .description(
    `Delete the named config fields. If no values remain in the config file,
     delete the file as well. By default, operates on the \`vlt.json\` file
     in the root of the current project. To delete a config field from the
     user config file, specify \`--config=user\`.`,
  )

  .heading('vlt config help [field ...]', 4, { pre: true })
  .description(
    `Get information about a config field, or show a list of known
    config field names.`,
  )

  .heading('Configuration')
  .description(
    `If a \`vlt.json\` file is present in the root of the current project,
     then that will be used as a source of configuration information.

     Next, the file at \`$HOME${sep}${relative(home, confDir)}\`
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
                    still map to \`https://registry.npmjs.org\` if this is
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
                    or other likely-transient errors from git hosts.`,
      default: 3,
    },
    'fetch-retry-factor': {
      hint: 'n',
      description: `The exponential factor to use when retrying`,
      default: 2,
    },
    'fetch-retry-mintimeout': {
      hint: 'n',
      description: `Number of milliseconds before starting first retry`,
      default: 60_000,
    },
    'fetch-retry-maxtimeout': {
      hint: 'n',
      description: `Maximum number of milliseconds between two retries`,
      default: 1000,
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
      validOptions: ['user', 'project'],
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
      validOptions: [...new Set(Object.values(commands))],
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

  .flag({
    help: {
      short: 'h',
      description: 'Print helpful information',
    },
  })
