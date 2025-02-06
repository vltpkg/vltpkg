/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/smoke.ts > TAP > commands > vlt > pkg > get > output 1`] = `
{
  "name": "hi"
}

`

exports[`test/smoke.ts > TAP > commands > vlt > pkg > get name > output 1`] = `
"hi"

`

exports[`test/smoke.ts > TAP > commands > vlt > pkg > get name version > output 1`] = `
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

Error: get requires not more than 1 argument. use \`pick\` to get more than 1.

`
