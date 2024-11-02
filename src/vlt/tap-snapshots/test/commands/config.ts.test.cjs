/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/config.ts > TAP > usage 1`] = `
Usage:
  vlt config <command> [flags]

Get or manipulate the configuration for the vlt CLI

  Subcommands

    get
      Get the value of a configuration key

      ​vlt config get <key> [<key> ...]

    ls
      List all configuration keys and values

      ​vlt config ls

    set
      Set the value of a configuration key

      ​vlt config set <key>=<value> [<key>=<value> ...] [--config=<user |
      project>]

    del
      Delete a configuration key

      ​vlt config del <key> [<key> ...] [--config=<user | project>]

    edit
      Edit the configuration file

      ​vlt config edit [--config=<user | project>]

    help
      Show help for a specific configuration field

      ​vlt config help [field ...]

`
