/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/pkg.ts > TAP > init > should init a new package.json file 1`] = `
{
  "name": "test-commands-pkg.ts-init",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "Ruy <ruy@example.com>"
}

`

exports[`test/commands/pkg.ts > TAP > usage 1`] = `
Usage:
  vlt pkg [<command>] [<args>]

Get or manipulate package.json values

  Subcommands

    get
      Get a single value

      ​vlt pkg get [<key>]

    init
      Initialize a new package.json file in the current directory

      ​vlt pkg init

    pick
      Get multiple values or the entire package

      ​vlt pkg pick [<key> [<key> ...]]

    set
      Set one or more key value pairs

      ​vlt pkg set <key>=<value> [<key>=<value> ...]

    delete
      Delete one or more keys from the package

      ​vlt pkg delete <key> [<key> ...]

  Examples

    Set a value on an object inside an array

    ​vlt pkg set "array[1].key=value"

    Append a value to an array

    ​vlt pkg set "array[]=value"

`
