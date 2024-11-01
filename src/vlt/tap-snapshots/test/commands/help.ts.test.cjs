/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/help.ts > TAP > basic > usage 1`] = `
vlt - A New Home for JavaScript
Usage:
  vlt [<options>] [<cmd> [<args> ...]]

Here goes a short description of the vlt command line client.

Much more documentation available at <https://docs.vlt.sh>

  Subcommands

    ​vlt install [packages ...]
      Install the specified packages, updating package.json and vlt-lock.json
      appropriately.

    ​vlt uninstall [packages ...]
      The opposite of \`vlt install\`. Removes deps and updates vlt-lock.json and
      package.json appropriately.

    ​vlt run <script> [args ...]
      Run a script defined in 'package.json', passing along any extra arguments.
      Note that vlt config values must be specified *before* the script name,
      because everything after that is handed off to the script process.

    ​vlt exec [args ...]
      Run an arbitrary command, with the local installed packages first in the
      PATH. Ie, this will run your locally installed package bins.

      If no command is provided, then a shell is spawned in the current working
      directory, with the locally installed package bins first in the PATH.

      Note that any vlt configs must be specified *before* the command, as the
      remainder of the command line options are provided to the exec process.

    ​vlt run-exec [args ...]
      If the first argument is a defined script in package.json, then this is
      equivalent to \`vlt run\`.

      If not, then this is equivalent to \`vlt exec\`.

    ​vlt config <subcommand>
      Work with vlt configuration

      ​vlt config get <key>
        Print the named config value

      ​vlt config list
        Print all configuration settings currently in effect

      ​vlt config set <key=value> [<key=value> ...]
        Set config values. By default, these are written to the project config
        file, \`vlt.json\` in the root of the project. To set things for all
        projects, run with \`--config=user\`

      ​vlt config del <key> [<key> ...]
        Delete the named config fields. If no values remain in the config file,
        delete the file as well. By default, operates on the \`vlt.json\` file in
        the root of the current project. To delete a config field from the user
        config file, specify \`--config=user\`.

      ​vlt config help [field ...]
        Get information about a config field, or show a list of known config
        field names.

  Configuration

    If a \`vlt.json\` file is present in the root of the current project, then
    that will be used as a source of configuration information.

    Next, the \`vlt.json\` file in the XDG specified config directory will be
    checked, and loaded for any fields not set in the local project.

    Object type values will be merged together. Set a field to \`null\` in the
    JSON configuration to explicitly remove it.

    Command-specific fields may be set in a nested \`command\` object that
    overrides any options defined at the top level.

  -c --color           Use colors (Default for TTY)
  -C --no-color        Do not use colors (Default for non-TTY)
  --registry=<url>     Sets the registry for fetching packages, when no registry
                       is explicitly set on a specifier.

                       For example, \`express@latest\` will be resolved by looking
                       up the metadata from this registry.

                       Note that alias specifiers starting with \`npm:\` will
                       still map to \`https://registry.npmjs.org/\` if this is
                       changed, unless the a new mapping is created via the
                       \`--registries\` option.

  --registries=<name=url>
                       Specify named registry hosts by their prefix. To set the
                       default registry used for non-namespaced specifiers, use
                       the \`--registry\` option.

                       Prefixes can be used as a package alias. For example:

                       \`\`\`
                       ​vlt --registries loc=http://reg.local install
                       foo@loc:foo@1.x
                       \`\`\`

                       By default, the public npm registry is registered to the
                       \`npm:\` prefix. It is not recommended to change this
                       mapping in most cases.

                       Can be set multiple times

  --scope-registries=<@scope=url>
                       Map package name scopes to registry URLs.

                       For example, \`--scope-registries
                       @acme=https://registry.acme/\` would tell vlt to fetch any
                       packages named \`@acme/...\` from the
                       \`https://registry.acme/\` registry.

                       Note: this way of specifying registries is more
                       ambiguous, compared with using the \`--registries\` field
                       and explicit prefixes, because instead of failing when
                       the configuration is absent, it will instead attempt to
                       fetch from the default registry.

                       By comparison, using \`--registries
                       acme=https://registry.acme/\` and then specifying
                       dependencies such as \`"foo": "acme:foo@1.x"\` means that
                       regardless of the name, the package will be fetched from
                       the explicitly named registry, or fail if no registry is
                       defined with that name.

                       However, custom registry aliases are not supported by
                       other package managers.

                       Can be set multiple times

  -G<name=template> --git-hosts=<name=template>
                       Map a shorthand name to a git remote URL template.

                       The \`template\` may contain placeholders, which will be
                       swapped with the relevant values.

                       \`$1\`, \`$2\`, etc. are replaced with the appropriate n-th
                       path portion. For example, \`github:user/project\` would
                       replace the \`$1\` in the template with \`user\`, and \`$2\`
                       with \`project\`.

                       Can be set multiple times

  -A<name=template> --git-host-archives=<name=template>
                       Similar to the \`--git-host <name>=<template>\` option,
                       this option can define a template string that will be
                       expanded to provide the URL to download a pre-built
                       tarball of the git repository.

                       In addition to the n-th path portion expansions performed
                       by \`--git-host\`, this field will also expand the string
                       \`$committish\` in the template, replacing it with the
                       resolved git committish value to be fetched.

                       Can be set multiple times

  --cache=<path>       Location of the vlt on-disk cache. Defaults to the
                       platform-specific directory recommended by the XDG
                       specification.

  --tag=<tag>          Default \`dist-tag\` to install
  --before=<date>      Do not install any packages published after this date
  --os=<os>            The operating system to use as the selector when choosing
                       packages based on their \`os\` value.

  --arch=<arch>        CPU architecture to use as the selector when choosing
                       packages based on their \`cpu\` value.

  --node-version=<version>
                       Node version to use when choosing packages based on their
                       \`engines.node\` value.

  --git-shallow        Set to force \`--depth=1\` on all git clone actions. When
                       set explicitly to false with --no-git-shallow, then
                       \`--depth=1\` will not be used.

                       When not set explicitly, \`--depth=1\` will be used for git
                       hosts known to support this behavior.

  --fetch-retries=<n>  Number of retries to perform when encountering network or
                       other likely-transient errors from git hosts.

  --fetch-retry-factor=<n>
                       The exponential factor to use when retrying

  --fetch-retry-mintimeout=<n>
                       Number of milliseconds before starting first retry

  --fetch-retry-maxtimeout=<n>
                       Maximum number of milliseconds between two retries
  -w<ws> --workspace=<ws>
                       Set to limit the spaces being worked on when working on
                       workspaces.

                       Can be paths or glob patterns matching paths.

                       Specifying workspaces by package.json name is not
                       supported.

                       Can be set multiple times

  -g<workspace-group> --workspace-group=<workspace-group>
                       Specify named workspace group names to load and operate
                       on when doing recursive operations on workspaces.

                       Can be set multiple times

  -r --recursive       Run an operation across multiple workspaces.

                       No effect when used in non-monorepo projects.

                       Implied by setting --workspace or --workspace-group. If
                       not set, then the action is run on the project root.

  -b --bail            When running scripts across multiple workspaces, stop on
                       the first failure.

  -B --no-bail         When running scripts across multiple workspaces, continue
                       on failure, running the script for all workspaces.

  --config=<user | project>
                       Specify whether to operate on user-level or project-level
                       configuration files when running \`vlt config\` commands.

                       Valid options: "user", "project"

  --editor=<program>   The blocking editor to use for \`vlt config edit\` and any
                       other cases where a file should be opened for editing.

                       Defaults to the \`EDITOR\` or \`VISUAL\` env if set, or
                       \`notepad.exe\` on Windows, or \`vi\` elsewhere.

  --script-shell=<program>
                       The shell to use when executing \`package.json#scripts\`
                       (either as lifecycle scripts or explicitly with \`vlt
                       run\`) and \`vlt exec\`.

                       If not set, defaults to \`/bin/sh\` on POSIX systems, and
                       \`cmd.exe\` on Windows.

                       When no argument is provided to \`vlt exec\`, the \`SHELL\`
                       environment variable takes precedence if set.

  --fallback-command=<command>
                       The command to run when the first argument doesn't match
                       any known commands.

                       For pnpm-style behavior, set this to 'run-exec'. e.g:

                       \`\`\`
                       ​vlt config set fallback-command=run-exec
                       \`\`\`



                       Valid options: "install", "uninstall", "run", "run-exec",
                       "exec", "help", "config", "install-exec", "pkg", "list",
                       "query", "gui"

  --package=<p>        When running \`vlt install-exec\`, this allows you to
                       explicitly set the package to search for bins. If not
                       provided, then vlt will interpret the first argument as
                       the package, and attempt to run the default executable.

  --view=<output>      Configures the output format for ls & query commands.
                       Valid options: "human", "json", "mermaid", "gui"

  -D --save-dev        Save installed packages to a package.json file as
                       devDependencies

  -O --save-optional   Save installed packages to a package.json file as
                       optionalDependencies

  --save-peer          Save installed packages to a package.json file as
                       peerDependencies

  -P --save-prod       Save installed packages into dependencies specifically.
                       This is useful if a package already exists in
                       devDependencies or optionalDependencies, but you want to
                       move it to be a non-optional production dependency.

  -h --help            Print helpful information
`
