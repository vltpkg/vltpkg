import { loadPackageJson } from 'package-json-from-dist'
import chalk from 'chalk'

const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

// Custom yellow color: #FFE15D
const customYellow = chalk.hex('#FFE15D')

type StylerFn = (style: string | string[], text: string) => string

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

// Single source of truth for all commands with metadata
const allCommands = [
  {
    name: 'bugs',
    aliases: [],
    args: '[<spec>]',
    desc: 'Open the bug tracker for a package',
    showByDefault: false,
  },
  {
    name: 'build',
    aliases: ['b'],
    args: '<selector>',
    desc: 'Build packages with lifecycle scripts',
    showByDefault: true,
    defaultOrder: 4,
  },
  {
    name: 'cache',
    aliases: [],
    args: '[add|ls|info|clean|delete|delete-before|delete-all]',
    desc: 'Manage the package cache',
    showByDefault: false,
  },
  {
    name: 'ci',
    aliases: [],
    args: '',
    desc: 'Clean install (frozen lockfile)',
    showByDefault: false,
  },
  {
    name: 'config',
    aliases: [],
    args: '[get|pick|list|set|delete|edit|location]',
    desc: 'Get or set configuration',
    showByDefault: false,
  },
  {
    name: 'docs',
    aliases: [],
    args: '',
    desc: 'Open the docs of the current project',
    showByDefault: false,
  },
  {
    name: 'exec',
    aliases: ['x'],
    args: '<executable>',
    desc: 'Execute a package bin',
    showByDefault: true,
    defaultOrder: 6,
  },
  {
    name: 'exec-cache',
    aliases: ['xc'],
    args: '[ls|delete|info|install]',
    desc: 'Manage the exec cache',
    showByDefault: false,
  },
  {
    name: 'exec-local',
    aliases: ['xl'],
    args: '<command>',
    desc: 'Execute a local package bin',
    showByDefault: false,
  },
  {
    name: 'help',
    aliases: ['h', '?'],
    args: '[<command>]',
    desc: 'Show help for a command',
    showByDefault: false,
  },
  {
    name: 'init',
    aliases: [],
    args: '',
    desc: 'Initialize a new project',
    showByDefault: true,
    defaultOrder: 1,
  },
  {
    name: 'install',
    aliases: ['i', 'add'],
    args: '[<package>...]',
    desc: 'Install dependencies',
    showByDefault: true,
    defaultOrder: 2,
  },
  {
    name: 'list',
    aliases: ['ls'],
    args: '',
    desc: 'List installed packages',
    showByDefault: false,
  },
  {
    name: 'login',
    aliases: [],
    args: '',
    desc: 'Authenticate with a registry',
    showByDefault: false,
  },
  {
    name: 'logout',
    aliases: [],
    args: '',
    desc: 'Log out from a registry',
    showByDefault: false,
  },
  {
    name: 'pack',
    aliases: [],
    args: '',
    desc: 'Create a tarball from a package',
    showByDefault: false,
  },
  {
    name: 'ping',
    aliases: [],
    args: '[<registry-alias>]',
    desc: 'Ping configured registries',
    showByDefault: false,
  },
  {
    name: 'pkg',
    aliases: ['p'],
    args: '<command>',
    desc: 'Manage package metadata',
    showByDefault: true,
    defaultOrder: 7,
  },
  {
    name: 'publish',
    aliases: ['pub'],
    args: '',
    desc: 'Publish package to registry',
    showByDefault: true,
    defaultOrder: 8,
  },
  {
    name: 'query',
    aliases: ['q'],
    args: '<selector>',
    desc: 'Query for packages in the project',
    showByDefault: true,
    defaultOrder: 3,
  },
  {
    name: 'repo',
    aliases: [],
    args: '[<spec>]',
    desc: 'Open the repository page for a package',
    showByDefault: false,
  },
  {
    name: 'run',
    aliases: ['r'],
    args: '<script>',
    desc: 'Run a script defined in package.json',
    showByDefault: true,
    defaultOrder: 5,
  },
  {
    name: 'run-exec',
    aliases: ['rx'],
    args: '<script>',
    desc: 'Run a script &/or fallback to executing a binary',
    showByDefault: false,
  },
  {
    name: 'token',
    aliases: [],
    args: '[add|rm]',
    desc: 'Manage authentication tokens',
    showByDefault: false,
  },
  {
    name: 'uninstall',
    aliases: ['rm'],
    args: '[<package>...]',
    desc: 'Remove dependencies',
    showByDefault: false,
  },
  {
    name: 'update',
    aliases: ['u'],
    args: '',
    desc: 'Update package versions to latest in-range',
    showByDefault: false,
  },
  {
    name: 'version',
    aliases: [],
    args: '<increment>',
    desc: 'Bump package version',
    showByDefault: false,
  },
  {
    name: 'whoami',
    aliases: [],
    args: '',
    desc: 'Display the current user',
    showByDefault: false,
  },
]

/**
 * Generates the custom default help output for vlt
 */
export const generateDefaultHelp = (colors = false): string => {
  const s = makeStyler(colors)

  // Get default commands and sort by defaultOrder
  const defaultCommands = allCommands
    .filter(cmd => cmd.showByDefault)
    .sort((a, b) => (a.defaultOrder || 0) - (b.defaultOrder || 0))

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

      return `  ${s('dim', aliasColumn)}${s(['yellow', 'bold'], nameColumn)}${s('dim', argsColumn)}${cmd.desc}`
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
      desc: 'Override default registry',
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

    // Fixed width columns for proper alignment with space after comma
    const aliasColumn =
      cmd.aliases.length > 0 ?
        (cmd.aliases.join(', ') + ', ').padEnd(9)
      : '         '
    const nameColumn = cmd.name.padEnd(12)
    // Truncate args if longer than 16 chars and add ellipsis
    const truncatedArgs =
      cmd.args.length > 16 ?
        cmd.args.substring(0, 13) + '...'
      : cmd.args
    const argsColumn = truncatedArgs.padEnd(16)

    commandsSection += `${s('dim', aliasColumn)}${s(['yellow', 'bold'], nameColumn)}${s('dim', argsColumn)}${cmd.desc}`

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
