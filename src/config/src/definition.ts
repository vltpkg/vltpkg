import { XDG } from '@vltpkg/xdg'
import { jack } from 'jackspeak'
import { homedir } from 'os'
import { relative, sep } from 'path'

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
] as const

/**
 * Definition of all configuration values used by vlt.
 */
export const definition = jack({
  envPrefix: 'VLT',
  allowPositionals: true,
  usage: `vlt [<options>] [<cmd> [<args> ...]]`,
})
  // TODO: fill this out with actual helpful stuff
  .heading('vlt - A New Home for JavaScript')
  .description(
    `Here goes a short description of the vlt command line client.

     Much more documentation available at <https://docs.vlt.sh>`,
  )
  .heading('Subcommands')
  // make this one an H3, and wrap in a <pre>
  .heading('vlt install [...packages]', 3, { pre: true })
  .description(
    `Install the specified packages, updating package.json and vlt-lock.json
     appropriately.`,
  )
  .heading('another command, put more stuff here', 3, { pre: true })
  .heading('Configuration')
  .description(
    `If a \`vlt.json\` file is present in the root of the current project,
     then that will be used as a source of configuration information.

     Next, the file at \`$HOME${sep}${relative(home, confDir)}${sep}vlt.json\`
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
      hint: `name=url`,
      description: `Specify named registry hosts by their prefix. To set the
                    default registry used for non-namespaced specifiers,
                    use the \`--registry\` option.

                    Prefixes can be used as a package alias. For example:

                    \`\`\`
                    vlt --registries loc=https://registry.local install foo@loc:foo@1.x
                    \`\`\`

                    By default, the public npm registry is registered to the
                    \`npm:\` prefix. It is not recommended to change this
                    mapping in most cases.
                    `,
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
      description: `Number of retries to perform when encountering network
                    or other likely-transient errors from git hosts.`,
      default: 3,
    },
    'fetch-retry-factor': {
      description: `The exponential factor to use when retrying`,
      default: 2,
    },
    'fetch-retry-mintimeout': {
      description: `Number of milliseconds before starting first retry`,
      default: 60_000,
    },
    'fetch-retry-maxtimeout': {
      description: `Maximum number of milliseconds between two retries`,
      default: 1000,
    },
  })
