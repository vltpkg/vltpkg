/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/use.ts > TAP > should create engines field when missing > should create engines field 1`] = `
parse add args from npm:pnpm@latest, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should create publishConfig when using --publish flag > should create publishConfig 1`] = `
parse add args from npm:node@latest, with values publish=true,save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should handle deno runtime > should install deno runtime 1`] = `
parse add args from npm:deno-bin@1.40.0, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should handle edge case with empty version > should handle empty version 1`] = `
parse add args from npm:yarn@latest, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should handle existing engines field > should preserve existing engines 1`] = `
parse add args from npm:npm@latest, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should handle runtime without version > should install bun runtime without version 1`] = `
parse add args from npm:bun@latest, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should install multiple runtimes > should install multiple runtimes 1`] = `
parse add args from npm:node@lts,npm:npm@latest, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should install node runtime > should install node@lts as devDependency 1`] = `
parse add args from npm:node@lts, with values save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > should use publishConfig.engines with --publish flag > should use publishConfig with --publish flag 1`] = `
parse add args from npm:node@20, with values publish=true,save-dev=true
install
read package.json from undefined
write package.json to undefined

`

exports[`test/commands/use.ts > TAP > usage 1`] = `
Usage:
  vlt use [runtime@version ...]

Install and manage JavaScript runtimes as devDependencies. Updates engines field
with references to installed runtimes. Use --publish to update
publishConfig.engines instead.

`
