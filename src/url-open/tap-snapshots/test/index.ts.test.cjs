/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > isTTY > darwin > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: \\u001b]8;;https://example.com/\\u001b\\\\https://example.com/\\u001b]8;;\\u001b\\\\",
  ],
]
`

exports[`test/index.ts > TAP > isTTY > darwin > spawns executed 1`] = `
Array [
  Array [
    "open",
    Array [
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > isTTY > linux > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: \\u001b]8;;https://example.com/\\u001b\\\\https://example.com/\\u001b]8;;\\u001b\\\\",
  ],
]
`

exports[`test/index.ts > TAP > isTTY > linux > spawns executed 1`] = `
Array [
  Array [
    "xdg-open",
    Array [
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > isTTY > win32 > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: \\u001b]8;;https://example.com/\\u001b\\\\https://example.com/\\u001b]8;;\\u001b\\\\",
  ],
]
`

exports[`test/index.ts > TAP > isTTY > win32 > spawns executed 1`] = `
Array [
  Array [
    "start \\"\\"",
    Array [
      "\\"\\"",
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > isTTY > WSL > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: \\u001b]8;;https://example.com/\\u001b\\\\https://example.com/\\u001b]8;;\\u001b\\\\",
  ],
]
`

exports[`test/index.ts > TAP > isTTY > WSL > spawns executed 1`] = `
Array [
  Array [
    "start \\"\\"",
    Array [
      "\\"\\"",
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > darwin > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: https://example.com/",
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > darwin > spawns executed 1`] = `
Array [
  Array [
    "open",
    Array [
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > linux > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: https://example.com/",
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > linux > spawns executed 1`] = `
Array [
  Array [
    "xdg-open",
    Array [
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > win32 > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: https://example.com/",
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > win32 > spawns executed 1`] = `
Array [
  Array [
    "start \\"\\"",
    Array [
      "\\"\\"",
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > WSL > logs printed 1`] = `
Array [
  Array [
    "Opening a web browser to: https://example.com/",
  ],
]
`

exports[`test/index.ts > TAP > not isTTY > WSL > spawns executed 1`] = `
Array [
  Array [
    "start \\"\\"",
    Array [
      "\\"\\"",
      "https://example.com/",
    ],
    Object {
      "shell": true,
      "signal": undefined,
      "stdio": "inherit",
    },
  ],
]
`
