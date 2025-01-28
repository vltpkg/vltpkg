/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > should sort dependencies by name in memory manifest > dependencies should be sorted by name 1`] = `
Object {
  "a": "1.0.0",
  "b": "1.0.0",
  "c": "1.0.0",
  "d": "1.0.0",
}
`

exports[`test/index.ts > TAP > should sort dependencies by name when saving > saved manifest dependencies should be sorted by name 1`] = `
{
        "name": "my-project",
        "version": "1.0.0",
        "dependencies": {
                "a": "1.0.0",
                "b": "1.0.0",
                "c": "1.0.0",
                "d": "1.0.0"
        }
}

`

exports[`test/index.ts > TAP > successfully saves a manifest > manifest should be read with original indent 1`] = `
{
        "name": "my-project",
        "version": "1.0.1"
}

`

exports[`test/index.ts > TAP > successfully writes a valid package.json file > manifest should be read with original indent 1`] = `
{
        "name": "my-project",
        "version": "1.0.1"
}

`
