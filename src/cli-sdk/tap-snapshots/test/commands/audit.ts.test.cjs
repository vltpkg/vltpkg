/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/audit.ts > TAP > audit > should have usage 1`] = `
Usage:
  vlt audit

Scan installed dependencies for security issues.

Provides a summary of security findings including malware, vulnerabilities, and
typosquats. Use --audit-level to filter by minimum severity.

  Examples

    Scan all dependencies for security issues

    ​vlt audit vlt audit

    Only show high and critical severity issues

    ​vlt audit vlt audit --audit-level=high

    Output results as JSON

    ​vlt audit vlt audit --view=json

  Options

    audit-level
      Minimum severity level to report. Defaults to low.

      ​--audit-level=[low | moderate | high | critical]

    omit
      Dependency types to skip.

      ​--omit=[dev | optional | peer]

    view
      Output format. Defaults to human-readable.

      ​--view=[human | json | count]

`
