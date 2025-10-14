/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/help.ts > TAP > basic > all usage 1`] = `
⚡️ vlt /vōlt/ - next-gen package management {{VERSION}}

USAGE

  vlt <command>

COMMANDS

b,       build       <selector>      Build packages with lifecycle scripts

         cache       [add|ls|info|...Manage the package cache
         ci                          Clean install (frozen lockfile)
         config      [get|pick|lis...Get or set configuration

         docs                        Open the docs of the current project

x,       exec        <executable>    Execute a package bin
xc,      exec-cache  [ls|delete|in...Manage the exec cache
xl,      exec-local  <command>       Execute a local package bin

h, ?,    help        [<command>]     Show help for a command

         init                        Initialize a new project
i, add,  install     [<package>...]  Install dependencies

ls,      list                        List installed packages
         login                       Authenticate with a registry
         logout                      Log out from a registry

         pack                        Create a tarball from a package
p,       pkg         <command>       Manage package metadata
pub,     publish                     Publish package to registry

q,       query       <selector>      Query for packages in the project

r,       run         <script>        Run a script defined in package.json
rx,      run-exec    <script>        Run a script &/or fallback to executing a binary

s,       serve                       Start a local package registry server

         token       [add|rm]        Manage authentication tokens

rm,      uninstall   [<package>...]  Remove dependencies
u,       update                      Update package versions to latest in-range

         version     <increment>     Bump package version

         whoami                      Display the current user

COMPANION BINS

  vlr    eq. vlt run
  vlx    eq. vlt exec

FLAGS

  -a,    --all                        Show all commands, bins, and flags
  -c,    --color                      Enable color output
  -h,    --help                       Print helpful information
         --no-color                   Disable color output
         --registry  <url>            Override default registry
  -v,    --version                    Print the version
  -y,    --yes                        Automatically accept prompts

Learn more: https://vlt.sh
Get support: https://vlt.community

Run \`vlt help <command>\` for detailed information about a specific command.
`

exports[`test/commands/help.ts > TAP > basic > default usage 1`] = `
⚡️ vlt /vōlt/ next-gen package management {{VERSION}}

USAGE

  vlt <command>

COMMON COMMANDS

       init                      Initialize a new project
  i,   install   [<package>...]  Install dependencies
  q,   query     <selector>      Query for packages in the project
  b,   build     <selector>      Build packages with lifecycle scripts
  r,   run       <script>        Run a script defined in package.json
  x,   exec      <executable>    Execute a package bin
  p,   pkg       <command>       Manage package metadata
  pub, publish                   Publish package to registry
  s,   serve                     Start a local package registry server
 
COMPANION BINS

  vlr            eq. vlt run
  vlx            eq. vlt exec
  
COMMON FLAGS

  -v, --version                  Log the cli version
  -a, --all                      List all commands, bins & flags

Learn more: https://vlt.sh
Get support: https://vlt.community

This is not the full usage information, run \`vlt -a\` for more.

`

exports[`test/commands/help.ts > TAP > basic > jack usage 1`] = `
Usage:
  vlt help [<command>]

Print the full help output for the CLI, or help for a specific command

  Aliases

    ​h, ?

  Examples

    Show general CLI help

    ​vlt help

    Show help for the install command

    ​vlt help install

    Show help for the run command

    ​vlt help run

`
