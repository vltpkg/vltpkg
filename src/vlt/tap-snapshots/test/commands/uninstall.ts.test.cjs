/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/uninstall.ts > TAP > should reify uninstalling a new dependency 1`] = `
Object {
  "actual": "actual.load result",
  "graph": "buildideal result removes 0 new package(s)",
  "loadManifests": true,
  "monorepo": undefined,
  "packageInfo": PackageInfoClient {
    "monorepo": undefined,
    "options": Object {
      "packageJson": PackageJson {},
      projectRoot: #
      "scurry": PathScurry {},
    },
    "packageJson": PackageJson {},
  },
  "packageJson": PackageJson {},
  projectRoot: #
  "remove": Map {
    "file·." => Set {},
  },
  "scurry": PathScurry {},
}
`

exports[`test/commands/uninstall.ts > TAP > usage 1`] = `
Usage:
  vlt uninstall [package ...]

The opposite of \`vlt install\`. Removes deps and updates vlt-lock.json and
package.json appropriately.

  Aliases

    ​rm, u

`
