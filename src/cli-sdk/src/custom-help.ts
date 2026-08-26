import { loadPackageJson } from 'package-json-from-dist'
import chalk from 'chalk'
import { commandAliases } from './config/definition.ts'
import type { Commands } from './config/definition.ts'

const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

// Custom yellow color: #FFE15D
const customYellow = chalk.hex('#FFE15D')

type StylerFn = (style: string | string[], text: string) => string

type CommandName = Commands[keyof Commands]

type CommandHelpMetadata = {
  args: string
  desc: string
  /** Position in the abbreviated help output. Omit for full help only. */
  defaultOrder?: number
}

type CommandHelp = CommandHelpMetadata & {
  name: string
  aliases: string[]
}

const makeStyler = (colors: boolean): StylerFn => {
  if (!colors) return (_, s) => s

  return (style: string | string[], text: string): string => {
    const styles = Array.isArray(style) ? style : [style]
    let styledText = text

    for (const s of styles) {
      switch (s) {
        case 'yellow':
        case 'yellowBright':
          styledText = customYellow(styledText)
          break
        case 'bold':
          styledText = chalk.bold(styledText)
          break
        case 'dim':
          styledText = chalk.dim(styledText)
          break
        case 'dark':
          styledText = chalk.gray(styledText)
          break
        case 'cyan':
          styledText = chalk.cyan(styledText)
          break
        case 'green':
          styledText = chalk.green(styledText)
          break
        default:
          // Fallback to chalk's built-in colors
          if (
            s in chalk &&
            typeof chalk[s as keyof typeof chalk] === 'function'
          ) {
            styledText = (
              chalk[s as keyof typeof chalk] as (
                text: string,
              ) => string
            )(styledText)
          }
          break
      }
    }

    return styledText
  }
}

/**
 * Help metadata for every command target in the command registry. Using a
 * record keyed by CommandName makes missing or stale entries a type error;
 * aliases are derived separately from the registry below.
 */
const commandHelp = {
  access: {
    args: '<command> [<args>]',
    desc: 'Manage package access and team permissions',
  },
  bugs: {
    args: '[<spec>]',
    desc: 'Open the bug tracker for a package',
  },
  build: {
    args: '<selector>',
    desc: 'Build packages with lifecycle scripts',
    defaultOrder: 4,
  },
  cache: {
    args: '[add|ls|info|clean|delete|delete-before|delete-all]',
    desc: 'Manage the package cache',
  },
  diff: {
    args: 'lockfile [<ref>] [<ref>]',
    desc: 'Show what changed between two states of a project',
  },
  ci: {
    args: '',
    desc: 'Clean install (frozen lockfile)',
  },
  config: {
    args: '[get|pick|list|set|delete|edit|location]',
    desc: 'Get or set configuration',
  },
  create: {
    args: '<initializer> [args...]',
    desc: 'Create a new project from a template',
  },
  deprecate: {
    args: '<pkg>[@<version>] <message>',
    desc: 'Deprecate a package or version range',
  },
  'dist-tag': {
    args: '[add|rm|ls] [<args>]',
    desc: 'Manage package distribution tags',
  },
  docs: {
    args: '',
    desc: 'Open the docs of the current project',
  },
  exec: {
    args: '<executable>',
    desc: 'Execute a package bin',
    defaultOrder: 6,
  },
  'exec-cache': {
    args: '[ls|delete|info|install]',
    desc: 'Manage the exec cache',
  },
  'exec-local': {
    args: '<command>',
    desc: 'Execute a local package bin',
  },
  help: {
    args: '[<command>]',
    desc: 'Show help for a command',
  },
  init: {
    args: '',
    desc: 'Initialize a new project',
    defaultOrder: 1,
  },
  install: {
    args: '[<package>...]',
    desc: 'Install dependencies',
    defaultOrder: 2,
  },
  list: {
    args: '',
    desc: 'List installed packages',
  },
  login: {
    args: '',
    desc: 'Authenticate with a registry',
  },
  logout: {
    args: '',
    desc: 'Log out from a registry',
  },
  pack: {
    args: '',
    desc: 'Create a tarball from a package',
  },
  ping: {
    args: '[<registry-alias>]',
    desc: 'Ping configured registries',
  },
  pkg: {
    args: '<command>',
    desc: 'Manage package metadata',
    defaultOrder: 7,
  },
  profile: {
    args: '<command> [<args>]',
    desc: 'Get or set registry profile properties',
  },
  publish: {
    args: '',
    desc: 'Publish package to registry',
    defaultOrder: 8,
  },
  query: {
    args: '<selector>',
    desc: 'Query for packages in the project',
    defaultOrder: 3,
  },
  registry: {
    args: '<alias> <command>',
    desc: 'Run an account command against a named registry',
    defaultOrder: 9,
  },
  repo: {
    args: '[<spec>]',
    desc: 'Open the repository page for a package',
  },
  run: {
    args: '<script>',
    desc: 'Run a script defined in package.json',
    defaultOrder: 5,
  },
  'run-exec': {
    args: '<script>',
    desc: 'Run a script &/or fallback to executing a binary',
  },
  setup: {
    args: '[<account>]',
    desc: 'Configure your vlt.io account registries',
    defaultOrder: 0,
  },
  token: {
    args: '[add|rm]',
    desc: 'Manage authentication tokens',
  },
  uninstall: {
    args: '[<package>...]',
    desc: 'Remove dependencies',
  },
  unpublish: {
    args: '<pkg>[@<version>]',
    desc: 'Remove a package from the registry',
  },
  update: {
    args: '',
    desc: 'Update package versions to latest in-range',
  },
  version: {
    args: '<increment>',
    desc: 'Bump package version',
  },
  view: {
    args: '<pkg>[@<version>] [<field>]',
    desc: 'View registry information about a package',
  },
  whoami: {
    args: '',
    desc: 'Display the current user',
  },
} as const satisfies Record<CommandName, CommandHelpMetadata>

const allCommands: CommandHelp[] = Object.entries(commandHelp).map(
  ([name, metadata]) => ({
    name,
    aliases: commandAliases.get(name) ?? [],
    ...metadata,
  }),
)

/**
 * Generates the custom default help output for vlt
 */
export const generateDefaultHelp = (colors = false): string => {
  const s = makeStyler(colors)

  // Get default commands and sort by defaultOrder
  const defaultCommands = allCommands
    .filter(cmd => cmd.defaultOrder !== undefined)
    .sort((a, b) => (a.defaultOrder ?? 0) - (b.defaultOrder ?? 0))

  // Generate commands with tighter alias spacing but proper table structure
  const commandsSection = defaultCommands
    .map(cmd => {
      // Tighter alias column (5 chars to accommodate space after comma) - only show first alias
      const firstAlias = cmd.aliases.length > 0 ? cmd.aliases[0] : ''
      const aliasColumn =
        firstAlias ? (firstAlias + ', ').padEnd(5) : '     '
      // Consistent name column (10 chars)
      const nameColumn = cmd.name.padEnd(10)
      // Consistent args column (14 chars)
      const argsColumn = cmd.args.padEnd(16)

      return `  ${s('dim', aliasColumn)}${s(['yellow', 'bold'], nameColumn)}${s('dim', argsColumn)} ${cmd.desc}`
    })
    .join('\n')

  return `${s(['bold'], '⚡️ vlt')} ${s('dim', '/vōlt/')} next-gen package management ${s('dim', `v${version}`)}

${s('bold', 'USAGE')}

  ${s('bold', 'vlt')} ${s('dim', '<command>')}

${s('bold', 'COMMON COMMANDS')}

${commandsSection}
 
${s('bold', 'COMPANION BINS')}

  ${s('bold', 'vlr')}            ${s('dim', 'eq. vlt run')}
  ${s('bold', 'vlx')}            ${s('dim', 'eq. vlt exec')}
  
${s('bold', 'COMMON FLAGS')}

  ${s('green', '-v, --version')}                  Log the cli version
  ${s('green', '-a, --all')}                      List all commands, bins & flags

Learn more: https://${s('bold', 'vlt.sh')}
Get support: https://${s('bold', 'vlt.community')}

${s('dim', `This is not the full usage information, run \`vlt -a\` for more.`)}
`
}

/**
 * Generates the full help output with all commands when --all flag is used
 */
export const generateFullHelp = (colors = false): string => {
  const s = makeStyler(colors)

  // Use all commands sorted alphabetically
  const commands = [...allCommands].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const aliasLabels = commands.map(cmd =>
    cmd.aliases.length ? `${cmd.aliases.join(', ')},` : '',
  )
  const aliasWidth = Math.max(
    ...aliasLabels.map(label => label.length),
  )

  // Define only globally applicable flags (alphabetically sorted by long name)
  const flags = [
    {
      shorts: ['a'],
      long: 'all',
      args: '',
      desc: 'Show all commands, bins, and flags',
    },
    {
      shorts: ['c'],
      long: 'color',
      args: '',
      desc: 'Enable color output',
    },
    {
      shorts: ['h'],
      long: 'help',
      args: '',
      desc: 'Print helpful information',
    },
    {
      shorts: [],
      long: 'no-color',
      args: '',
      desc: 'Disable color output',
    },
    {
      shorts: [],
      long: 'registry',
      args: '<url>',
      desc: 'Set the registry to resolve packages against',
    },
    {
      shorts: ['v'],
      long: 'version',
      args: '',
      desc: 'Print the version',
    },
    {
      shorts: ['y'],
      long: 'yes',
      args: '',
      desc: 'Automatically accept prompts',
    },
  ]

  // Generate commands section with letter grouping spacing
  let commandsSection = ''
  let lastFirstLetter = ''

  commands.forEach((cmd, index) => {
    const firstLetter = cmd.name[0]?.toLowerCase() || ''

    // Add extra spacing between different letter groups
    if (firstLetter !== lastFirstLetter && index > 0) {
      commandsSection += '\n'
    }

    const aliasColumn = aliasLabels[index]?.padEnd(aliasWidth) ?? ''
    const nameColumn = cmd.name.padEnd(12)
    // Truncate args if longer than 16 chars and add ellipsis
    const truncatedArgs =
      cmd.args.length > 16 ?
        cmd.args.substring(0, 13) + '...'
      : cmd.args
    const argsColumn = truncatedArgs.padEnd(16)

    commandsSection += `  ${s('dim', aliasColumn)} ${s(['yellow', 'bold'], nameColumn)} ${s('dim', argsColumn)} ${cmd.desc}`

    if (index < commands.length - 1) {
      commandsSection += '\n'
    }

    lastFirstLetter = firstLetter
  })

  // Generate flags section with same structure as commands
  const flagsSection = flags
    .map(f => {
      // Match command structure: alias column, name column, args column, description
      const aliasColumn =
        f.shorts.length > 0 ?
          ('-' + f.shorts.join(', -') + ', ').padEnd(7)
        : '       '
      const nameColumn = ('--' + f.long).padEnd(12)
      const argsColumn = (f.args || '').padEnd(17)

      return `  ${s('dim', aliasColumn)}${s('green', nameColumn)}${s('dim', argsColumn)}${f.desc}`
    })
    .join('\n')

  return `${s(['bold'], '⚡️ vlt')} ${s('dim', '/vōlt/')} ${s('dim', '- next-gen package management')} ${s('dim', `v${version}`)}

${s('bold', 'USAGE')}

  ${s('bold', 'vlt')} ${s('dim', '<command>')}

${s('bold', 'COMMANDS')}

${commandsSection}

${s('bold', 'COMPANION BINS')}

  vlr    ${s('dim', 'eq. vlt run')}
  vlx    ${s('dim', 'eq. vlt exec')}

${s('bold', 'FLAGS')}

${flagsSection}

Learn more: https://${s('bold', 'vlt.sh')}
Get support: https://${s('bold', 'vlt.community')}

${s('dim', `Run \`vlt help <command>\` for detailed information about a specific command.`)}`
}
