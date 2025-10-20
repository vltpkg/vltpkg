/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/config.ts > TAP > usage 1`] = `
Usage:
  vlt config [<command>] [<args>]

Get or manipulate vlt configuration values

  Subcommands

    get
      Get a single config value. Use --config to specify which config to read
      from.

      ​vlt config get [<key>] [--config=<all | user | project>]

    pick
      Get multiple config values or all configuration. Use --config to specify
      which config to read from.

      ​vlt config pick [<key> [<key> ...]] [--config=<all | user | project>]

    list
      Print configuration settings. --config=all shows merged config (default),
      --config=user shows only user config, --config=project shows only project
      config.

      ​vlt config list [--config=<all | user | project>]

    set
      Set config values. By default (or with --config=all), these are written to
      the project config file, \`vlt.json\` in the root of the project. To set
      things for all projects, run with \`--config=user\`.

      ​vlt config set <key>=<value> [<key>=<value> ...] [--config=<all | user |
      project>]

    delete
      Delete the named config fields. If no values remain in the config file,
      delete the file as well. By default (or with --config=all), operates on
      the \`vlt.json\` file in the root of the current project. To delete a config
      field from the user config file, specify \`--config=user\`.

      ​vlt config delete <key> [<key> ...] [--config=<all | user | project>]

    edit
      Edit the configuration file. By default (or with --config=all), edits the
      project config file.

      ​vlt config edit [--config=<all | user | project>]

    location
      Show the file path of the configuration file. Defaults to project config.

      ​vlt config location [--config=<user | project>]

`
