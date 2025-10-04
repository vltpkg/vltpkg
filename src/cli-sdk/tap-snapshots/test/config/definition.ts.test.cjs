/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/config/definition.ts > TAP > commands 1`] = `
Object {
  "?": "help",
  "add": "install",
  "cache": "cache",
  "ci": "ci",
  "config": "config",
  "exec": "exec",
  "exec-cache": "exec-cache",
  "exec-local": "exec-local",
  "h": "help",
  "help": "help",
  "i": "install",
  "init": "init",
  "install": "install",
  "list": "list",
  "login": "login",
  "logout": "logout",
  "ls": "list",
  "pack": "pack",
  "pkg": "pkg",
  "publish": "publish",
  "query": "query",
  "r": "run",
  "rm": "uninstall",
  "run": "run",
  "run-exec": "run-exec",
  "run-script": "run",
  "rx": "run-exec",
  "serve": "serve",
  "token": "token",
  "u": "uninstall",
  "uninstall": "uninstall",
  "update": "update",
  "version": "version",
  "whoami": "whoami",
  "x": "exec",
  "xc": "exec-cache",
  "xl": "exec-local",
}
`

exports[`test/config/definition.ts > TAP > definition 1`] = `
Object {
  "access": Object {
    "description": "Set the access level of the package",
    "type": "string",
    "validOptions": Array [
      "public",
      "restricted",
    ],
  },
  "arch": Object {
    "description": "CPU architecture to use as the selector when choosing packages based on their \`cpu\` value.",
    "type": "string",
  },
  "bail": Object {
    "description": "When running scripts across multiple workspaces, stop on the first failure.",
    "short": "b",
    "type": "boolean",
  },
  "before": Object {
    "description": "Do not install any packages published after this date",
    "hint": "date",
    "type": "string",
  },
  "cache": Object {
    "description": "Location of the vlt on-disk cache. Defaults to the platform-specific directory recommended by the XDG specification.",
    "hint": "path",
    "type": "string",
  },
  "color": Object {
    "description": "Use colors (Default for TTY)",
    "short": "c",
    "type": "boolean",
  },
  "config": Object {
    "description": "Specify which configuration to show or operate on when running \`vlt config\` commands. For read operations (get, pick, list): \`all\` shows merged configuration from both user and project files (default). For write operations (set, delete, edit): defaults to \`project\`. \`user\` shows/modifies only user-level configuration, \`project\` shows/modifies only project-level configuration.",
    "hint": "all | user | project",
    "type": "string",
    "validOptions": Array [
      "all",
      "user",
      "project",
    ],
  },
  "dashboard-root": Object {
    "description": "The root directory to use for the dashboard browser-based UI. If not set, the user home directory is used.",
    "hint": "path",
    "multiple": true,
    "type": "string",
  },
  "dry-run": Object {
    "description": "Run command without making any changes",
    "type": "boolean",
  },
  "editor": Object {
    "description": String(
      The blocking editor to use for \`vlt config edit\` and any other cases where a file should be opened for editing.
      
      Defaults to the \`EDITOR\` or \`VISUAL\` env if set, or \`notepad.exe\` on Windows, or \`vi\` elsewhere.
    ),
    "hint": "program",
    "type": "string",
  },
  "expect-lockfile": Object {
    "description": "Fail if lockfile is missing or out of date. Used by ci command to enforce lockfile integrity.",
    "type": "boolean",
  },
  "expect-results": Object {
    "description": String(
      When running \`vlt query\`, this option allows you to set a expected number of resulting items.
      
      Accepted values are numbers and strings.
      
      Strings starting with \`>\`, \`<\`, \`>=\` or \`<=\` followed by a number can be used to check if the result is greater than or less than a specific number.
    ),
    "hint": "value",
    "type": "string",
    "validate": Function validate(v),
  },
  "fallback-command": Object {
    "description": String(
      The command to run when the first argument doesn't match any known commands.
      
      For pnpm-style behavior, set this to 'run-exec'. e.g:
      
      \`\`\`
      ​vlt config set fallback-command=run-exec
      \`\`\`
      
      
    ),
    "hint": "command",
    "type": "string",
    "validOptions": Array [
      "cache",
      "ci",
      "config",
      "exec",
      "exec-local",
      "help",
      "init",
      "install",
      "login",
      "logout",
      "list",
      "ls",
      "pack",
      "pkg",
      "publish",
      "query",
      "run-exec",
      "run",
      "serve",
      "token",
      "uninstall",
      "update",
      "exec-cache",
      "version",
      "whoami",
    ],
  },
  "fetch-retries": Object {
    "description": "Number of retries to perform when encountering network errors or likely-transient errors from git hosts.",
    "hint": "n",
    "type": "number",
  },
  "fetch-retry-factor": Object {
    "description": "The exponential backoff factor to use when retrying requests due to network issues.",
    "hint": "n",
    "type": "number",
  },
  "fetch-retry-maxtimeout": Object {
    "description": "Maximum number of milliseconds between two retries",
    "hint": "n",
    "type": "number",
  },
  "fetch-retry-mintimeout": Object {
    "description": "Number of milliseconds before starting first retry",
    "hint": "n",
    "type": "number",
  },
  "frozen-lockfile": Object {
    "description": "Fail if lockfile is missing or out of sync with package.json. Prevents any lockfile modifications.",
    "type": "boolean",
  },
  "git-host-archives": Object {
    "description": String(
      Similar to the \`--git-host <name>=<template>\` option, this option can define a template string that will be expanded to provide the URL to download a pre-built tarball of the git repository.
      
      In addition to the n-th path portion expansions performed by \`--git-host\`, this field will also expand the string \`$committish\` in the template, replacing it with the resolved git committish value to be fetched.
    ),
    "hint": "name=template",
    "multiple": true,
    "short": "A",
    "type": "string",
  },
  "git-hosts": Object {
    "description": String(
      Map a shorthand name to a git remote URL template.
      
      The \`template\` may contain placeholders, which will be swapped with the relevant values.
      
      \`$1\`, \`$2\`, etc. are replaced with the appropriate n-th path portion. For example, \`github:user/project\` would replace the \`$1\` in the template with \`user\`, and \`$2\` with \`project\`.
    ),
    "hint": "name=template",
    "multiple": true,
    "short": "G",
    "type": "string",
  },
  "git-shallow": Object {
    "description": String(
      Set to force \`--depth=1\` on all git clone actions. When set explicitly to false with --no-git-shallow, then \`--depth=1\` will not be used.
      
      When not set explicitly, \`--depth=1\` will be used for git hosts known to support this behavior.
    ),
    "type": "boolean",
  },
  "help": Object {
    "description": "Print helpful information",
    "short": "h",
    "type": "boolean",
  },
  "identity": Object {
    "description": String(
      Provide a string to define an identity for storing auth information when logging into registries.
      
      Authentication tokens will be stored in the XDG data directory, in \`vlt/auth/\${identity}/keychain.json\`.
      
      If no identity is provided, then the default \`''\` will be used, storing the file at \`vlt/auth/keychain.json\`.
      
      May only contain lowercase alphanumeric characters.
    ),
    "hint": "name",
    "short": "i",
    "type": "string",
    "validate": Function validate(v),
  },
  "if-present": Object {
    "description": String(
      When running scripts across multiple packages, only include packages that have the script.
      
      If this is not set, then the run will fail if any packages do not have the script.
      
      This will default to true if --scope, --workspace,
      --workspace-group, or --recursive is set. Otherwise, it will default to false.
    ),
    "type": "boolean",
  },
  "jsr-registries": Object {
    "description": String(
      Map alias names to JSR.io registry urls.
      
      For example, \`--jsr-registries acme=https://jsr.acme.io/\` would tell vlt to fetch any packages with the \`acme:\` registry prefix from the \`https://jsr.acme.io/\` registry, using the "npm Compatibility" translation. So for example, the package \`acme:@foo/bar\` would fetch the \`@jsr/foo__bar\` package from the \`jsr.acme.io\` registry.
      
      By default the \`jsr\` alias is always mapped to \`https://npm.jsr.io/\`, so existing \`jsr:\` packages will be fetched from the public \`jsr\` registry appropriately.
    ),
    "hint": "name=url",
    "multiple": true,
    "type": "string",
  },
  "no-bail": Object {
    "description": "When running scripts across multiple workspaces, continue on failure, running the script for all workspaces.",
    "short": "B",
    "type": "boolean",
  },
  "no-color": Object {
    "description": "Do not use colors (Default for non-TTY)",
    "short": "C",
    "type": "boolean",
  },
  "node-version": Object {
    "description": "Node version to use when choosing packages based on their \`engines.node\` value.",
    "hint": "version",
    "type": "string",
  },
  "os": Object {
    "description": "The operating system to use as the selector when choosing packages based on their \`os\` value.",
    "type": "string",
  },
  "otp": Object {
    "description": "Provide an OTP to use when publishing a package.",
    "type": "string",
  },
  "package": Object {
    "description": "When running \`vlt exec\`, this allows you to explicitly set the package to search for bins. If not provided, then vlt will interpret the first argument as the package, and attempt to run the default executable.",
    "hint": "p",
    "type": "string",
  },
  "port": Object {
    "description": "Port for the browser-based UI server when using vlt serve command (default: 8000).",
    "hint": "number",
    "type": "string",
  },
  "publish-directory": Object {
    "description": "Directory to use for pack and publish operations instead of the current directory. The directory must exist and nothing will be copied to it.",
    "hint": "path",
    "type": "string",
  },
  "recursive": Object {
    "description": String(
      Run an operation across multiple workspaces.
      
      No effect when used in non-monorepo projects.
      
      Implied by setting --workspace or --workspace-group. If not set, then the action is run on the project root.
    ),
    "short": "r",
    "type": "boolean",
  },
  "registries": Object {
    "description": String(
      Specify named registry hosts by their prefix. To set the default registry used for non-namespaced specifiers, use the \`--registry\` option.
      
      Prefixes can be used as a package alias. For example:
      
      \`\`\`
      ​vlt --registries loc=http://reg.local install foo@loc:foo@1.x
      \`\`\`
      
      By default, the public npm registry is registered to the \`npm:\` prefix. It is not recommended to change this mapping in most cases.
    ),
    "hint": "name=url",
    "multiple": true,
    "type": "string",
  },
  "registry": Object {
    "description": String(
      Sets the registry for fetching packages, when no registry is explicitly set on a specifier.
      
      For example, \`express@latest\` will be resolved by looking up the metadata from this registry.
      
      Note that alias specifiers starting with \`npm:\` will still map to \`https://registry.npmjs.org/\` if this is changed, unless the a new mapping is created via the \`--registries\` option.
    ),
    "hint": "url",
    "type": "string",
  },
  "registry-port": Object {
    "description": "Port for the VSR registry when using vlt serve command (default: 1337).",
    "hint": "number",
    "type": "string",
  },
  "save-dev": Object {
    "description": "Save installed packages to a package.json file as devDependencies",
    "short": "D",
    "type": "boolean",
  },
  "save-optional": Object {
    "description": "Save installed packages to a package.json file as optionalDependencies",
    "short": "O",
    "type": "boolean",
  },
  "save-peer": Object {
    "description": "Save installed packages to a package.json file as peerDependencies",
    "type": "boolean",
  },
  "save-prod": Object {
    "description": "Save installed packages into dependencies specifically. This is useful if a package already exists in devDependencies or optionalDependencies, but you want to move it to be a non-optional production dependency.",
    "short": "P",
    "type": "boolean",
  },
  "scope": Object {
    "description": "Set to filter the scope of an operation using a DSS Query.",
    "short": "s",
    "type": "string",
  },
  "scope-registries": Object {
    "description": String(
      Map package name scopes to registry URLs.
      
      For example, \`--scope-registries @acme=https://registry.acme/\` would tell vlt to fetch any packages named \`@acme/...\` from the \`https://registry.acme/\` registry.
      
      Note: this way of specifying registries is more ambiguous, compared with using the \`--registries\` field and explicit prefixes, because instead of failing when the configuration is absent, it will instead attempt to fetch from the default registry.
      
      By comparison, using \`--registries acme=https://registry.acme/\` and then specifying dependencies such as \`"foo": "acme:foo@1.x"\` means that regardless of the name, the package will be fetched from the explicitly named registry, or fail if no registry is defined with that name.
      
      However, custom registry aliases are not supported by other package managers.
    ),
    "hint": "@scope=url",
    "multiple": true,
    "type": "string",
  },
  "script-shell": Object {
    "description": String(
      The shell to use when executing \`package.json#scripts\`.
      
      For \`vlt exec\` and \`vlt exec-local\`, this is never set, meaning that command arguments are run exactly as provided.
      
      For \`vlt run\` (and other things that run lifecycle scripts in \`package.json#scripts\`), the entire command with all arguments is provided as a single string, meaning that some value must be provided for shell interpretation, and so for these contexts, the \`script-shell\` value will default to \`/bin/sh\` on POSIX systems or \`cmd.exe\` on Windows.
    ),
    "hint": "program",
    "type": "string",
  },
  "stale-while-revalidate-factor": Object {
    "description": String(
      If the server does not serve a \`stale-while-revalidate\` value in the \`cache-control\` header, then this multiplier is applied to the \`max-age\` or \`s-maxage\` values.
      
      By default, this is \`60\`, so for example a response that is cacheable for 5 minutes will allow a stale response while revalidating for up to 5 hours.
      
      If the server *does* provide a \`stale-while-revalidate\` value, then that is always used.
      
      Set to 0 to prevent any \`stale-while-revalidate\` behavior unless explicitly allowed by the server's \`cache-control\` header.
    ),
    "hint": "n",
    "type": "number",
  },
  "tag": Object {
    "description": "Default \`dist-tag\` to install or publish",
    "type": "string",
  },
  "target": Object {
    "description": "Set to select packages using a DSS Query selector.",
    "short": "t",
    "type": "string",
  },
  "version": Object {
    "description": "Print the version",
    "short": "v",
    "type": "boolean",
  },
  "view": Object {
    "description": String(
      Configures the output format for commands.
      
      Defaults to \`human\` if stdout is a TTY, or \`json\` if it is not.
      
      - human: Maximally ergonomic output reporting for human consumption.
      - json: Parseable JSON output for machines.
      - inspect: Output results with \`util.inspect\`.
      - gui: Start a local web server and opens a browser to explore the results. (Only relevant for certain commands.)
      - mermaid: Output mermaid diagramming syntax. (Only relevant for certain commands.)
      - silent: Suppress all output to stdout.
      
      If the requested view format is not supported for the current command, or if no option is provided, then it will fall back to the default.
    ),
    "hint": "output",
    "type": "string",
    "validOptions": Array [
      "human",
      "json",
      "mermaid",
      "gui",
      "inspect",
      "silent",
    ],
  },
  "workspace": Object {
    "description": String(
      Set to limit the spaces being worked on when working on workspaces.
      
      Can be paths or glob patterns matching paths.
      
      Specifying workspaces by package.json name is not supported.
    ),
    "hint": "ws",
    "multiple": true,
    "short": "w",
    "type": "string",
  },
  "workspace-group": Object {
    "description": "Specify named workspace group names to load and operate on when doing recursive operations on workspaces.",
    "multiple": true,
    "short": "g",
    "type": "string",
  },
  "yes": Object {
    "description": "Automatically accept any confirmation prompts",
    "short": "y",
    "type": "boolean",
  },
}
`

exports[`test/config/definition.ts > TAP > getSortedCliDefinitions > sorted CLI definitions 1`] = `
Array [
  "--access=<access>",
  "--arch=<arch>",
  "--bail",
  "--before=<date>",
  "--cache=<path>",
  "--color",
  "--config=<all | user | project>",
  "--dashboard-root=<path>",
  "--dry-run",
  "--editor=<program>",
  "--expect-lockfile",
  "--expect-results=<value>",
  "--fallback-command=<command>",
  "--fetch-retries=<n>",
  "--fetch-retry-factor=<n>",
  "--fetch-retry-maxtimeout=<n>",
  "--fetch-retry-mintimeout=<n>",
  "--frozen-lockfile",
  "--git-host-archives=<name=template>",
  "--git-hosts=<name=template>",
  "--git-shallow",
  "--help",
  "--identity=<name>",
  "--if-present",
  "--jsr-registries=<name=url>",
  "--no-bail",
  "--no-color",
  "--node-version=<version>",
  "--os=<os>",
  "--otp=<otp>",
  "--package=<p>",
  "--port=<number>",
  "--publish-directory=<path>",
  "--recursive",
  "--registries=<name=url>",
  "--registry=<url>",
  "--registry-port=<number>",
  "--save-dev",
  "--save-optional",
  "--save-peer",
  "--save-prod",
  "--scope=<scope>",
  "--scope-registries=<@scope=url>",
  "--script-shell=<program>",
  "--stale-while-revalidate-factor=<n>",
  "--tag=<tag>",
  "--target=<target>",
  "--version",
  "--view=<output>",
  "--workspace=<ws>",
  "--workspace-group=<workspace-group>",
  "--yes",
]
`

exports[`test/config/definition.ts > TAP > getSortedKeys > sorted keys 1`] = `
Array [
  "access",
  "arch",
  "bail",
  "before",
  "cache",
  "color",
  "config",
  "dashboard-root",
  "dry-run",
  "editor",
  "expect-lockfile",
  "expect-results",
  "fallback-command",
  "fetch-retries",
  "fetch-retry-factor",
  "fetch-retry-maxtimeout",
  "fetch-retry-mintimeout",
  "frozen-lockfile",
  "git-host-archives",
  "git-hosts",
  "git-shallow",
  "help",
  "identity",
  "if-present",
  "jsr-registries",
  "no-bail",
  "no-color",
  "node-version",
  "os",
  "otp",
  "package",
  "port",
  "publish-directory",
  "recursive",
  "registries",
  "registry",
  "registry-port",
  "save-dev",
  "save-optional",
  "save-peer",
  "save-prod",
  "scope",
  "scope-registries",
  "script-shell",
  "stale-while-revalidate-factor",
  "tag",
  "target",
  "version",
  "view",
  "workspace",
  "workspace-group",
  "yes",
]
`
