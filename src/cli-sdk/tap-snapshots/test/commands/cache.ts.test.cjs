/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/cache.ts > TAP > cache basics > must match snapshot 1`] = `
Usage:

\`\`\`
vlt cache <command> [flags]
\`\`\`

Work with vlt cache folders

## Subcommands

### add

Resolve the referenced package identifiers and ensure they are cached.

\`\`\`
vlt cache add <package-spec> [<package-spec>...]
\`\`\`

### ls

Show cache entries. If no keys are provided, then a list of available keys will be printed. If one or more keys are provided, then details will be shown for the specified items.

\`\`\`
vlt cache ls [<key>...]
\`\`\`

### info

Print metadata details for the specified cache key to stderr, and the response body to stdout.

\`\`\`
vlt cache info <key>
\`\`\`

### clean

Purge expired cache entries. If one or more keys are provided, then only those cache entries will be considered.

\`\`\`
vlt cache clean [<key>...]
\`\`\`

### delete

Purge items explicitly, whether expired or not. If one or more keys are provided, then only those cache entries will be considered.

\`\`\`
vlt cache delete <key> [<key>...]
\`\`\`

### delete-before

Purge all cache items from before a given date. Date can be provided in any format that JavaScript can parse.

\`\`\`
vlt cache delete-before <date>
\`\`\`

### delete-all

Delete the entire cache folder to make vlt slower.

\`\`\`
vlt cache delete-all
\`\`\`

## Examples

Show cache metadata for a given registry URL

\`\`\`
vlt cache vlt cache ls https://registry.npmjs.org/typescript
\`\`\`

Add a given package specifier to the cache by fetching its resolved value.

\`\`\`
vlt cache vlt cache add eslint@latest
\`\`\`

Print the cache metadata to stderr, and write the tarball on stdout, redirecting to a file.

\`\`\`
vlt cache vlt cache info https://registry.npmjs.org/eslint/-/eslint-9.25.1.tgz > eslint.tgz
\`\`\`

Delete all entries created before Jan 1, 2025

\`\`\`
vlt cache vlt cache delete-before 2025-01-01
\`\`\`

`

exports[`test/commands/cache.ts > TAP > logged by add 1`] = `
Array [
  Array [
    "+",
    "pkg",
    "https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz",
  ],
]
`

exports[`test/commands/cache.ts > TAP > logged by cache basics 1`] = `
Array []
`

exports[`test/commands/cache.ts > TAP > logged by clean 1`] = `
Array []
`

exports[`test/commands/cache.ts > TAP > logged by delete 1`] = `
Array [
  Array [
    "-",
    "https://registry.npmjs.org/xyz",
    488,
  ],
  Array [
    "Not found:",
    "some-random-key-not-found",
  ],
  Array [
    "Removed 1 item totalling 488 B",
  ],
]
`

exports[`test/commands/cache.ts > TAP > logged by delete-all 1`] = `
Array [
  Array [
    "Deleted all cache entries.",
  ],
]
`

exports[`test/commands/cache.ts > TAP > logged by delete-before 1`] = `
Array []
`

exports[`test/commands/cache.ts > TAP > logged by human view coverage bits 1`] = `
Array [
  Array [
    "hello",
    "world",
  ],
]
`

exports[`test/commands/cache.ts > TAP > logged by info 1`] = `
Array [
  Array [
    String(
      {
        "name": "xyz",
        "dist-tags": {
          "latest": "1.2.3"
        },
        "versions": {
          "1.2.3": {
            "name": "xyz",
            "version": "1.2.3",
            "dist": {
              "tarball": "https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz",
              "integrity": "sha512-Sj7YFH43h2rcj3Yyjlq8wbRw5qz8GO/qATX5g2BJU6WOGDwaYIbpG6PoIdkm9f3rN3YcfKAyipY/XpKHBnW3KA=="
            }
          }
        }
      }
    ),
  ],
]
`

exports[`test/commands/cache.ts > TAP > logged by ls 1`] = `
Array [
  Array [
    "\\"HEAD https://registry.npmjs.org/xyz\\"",
  ],
  Array [
    "\\"HEAD https://registry.npmjs.org/xyz\\"",
    CacheEntry {},
  ],
  Array [
    "https://registry.npmjs.org/xyz",
  ],
  Array [
    "https://registry.npmjs.org/xyz",
    CacheEntry {},
  ],
  Array [
    "https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz",
  ],
  Array [
    "Not found:",
    "asdfasdfasdf",
  ],
]
`

exports[`test/commands/cache.ts > TAP > ls > all results 1`] = `
Array [
  "HEAD https://registry.npmjs.org/xyz",
  "https://registry.npmjs.org/xyz",
  "https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz",
]
`

exports[`test/commands/cache.ts > TAP > ls > one result 1`] = `
Array [
  "https://registry.npmjs.org/xyz",
  "HEAD https://registry.npmjs.org/xyz",
]
`
