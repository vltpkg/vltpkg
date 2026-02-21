/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/create.ts > TAP > promptFn > must match snapshot 1`] = `
About to install: a@1.2.3
from: https://registry.npmjs.org/a/a-1.2.3.tgz
into: /some/path
Is this ok? (y) 
`

exports[`test/commands/create.ts > TAP > usage > usage 1`] = `
Usage:
  vlt create <initializer> [args...]

Initialize a new project from a template package.

Works like \`npm create\` and \`bun create\`, automatically prepending "create-" to
the package name and executing it.

For example, \`vlt create react-app my-app\` will fetch and execute the
\`create-react-app\` package with the arguments \`my-app\`.

If a satisfying instance of the create package exists in the local
\`node_modules\` folder, then that will be used.

At no point will \`vlt create\` change the locally installed dependencies. Any
installs it performs is done in vlt's XDG data directory.

  Examples

    Create a new React app using create-react-app

    ​vlt create react-app my-app

    Create a new Vite project using create-vite

    ​vlt create vite my-project

    Create a new project using @scope/create-template

    ​vlt create @scope/template my-app

  Options

    allow-scripts
      Filter which packages are allowed to run lifecycle scripts using DSS query
      syntax.

      ​--allow-scripts=<query>

`
