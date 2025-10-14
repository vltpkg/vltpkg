/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/serve.ts > TAP > usage > usage 1`] = `
Usage:
  vlt serve

Start a local development server that runs both the browser-based UI server and
the VSR (vlt serverless registry) registry instance.

The UI server will start first on port 8000 (or the next available port), and
then the VSR registry will start on port 1337.

This allows you to develop and test the full vlt ecosystem locally, including
package publishing and installation from your local registry.

  Aliases

    ​s

  Options

    port
      Port for the broser-based UI server (default: 8000)

      ​--port=<number>

    registry-port
      Port for the VSR registry (default: 1337)

      ​--registry-port=<number>

`
