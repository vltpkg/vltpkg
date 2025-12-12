/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > async graph traversal > cycles 1`] = `
Array [
  Array [
    4,
    Array [
      1,
      4,
      2,
      1,
    ],
    Array [
      64,
      32,
      16,
      8,
      4,
      2,
      1,
    ],
  ],
]
`

exports[`test/index.ts > TAP > async graph traversal > paths 1`] = `
Object {
  "1": Array [
    64,
    32,
    16,
    8,
    4,
    2,
  ],
  "10": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
    40,
    20,
  ],
  "106": Array [
    23,
    70,
    35,
  ],
  "11": Array [
    22,
  ],
  "13": Array [
    22,
    11,
    34,
    17,
    52,
    26,
  ],
  "16": Array [
    64,
    32,
  ],
  "160": Array [
    23,
    70,
    35,
    106,
    53,
  ],
  "17": Array [
    22,
    11,
    34,
  ],
  "2": Array [
    64,
    32,
    16,
    8,
    4,
  ],
  "20": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
    40,
  ],
  "22": Array [],
  "23": Array [],
  "26": Array [
    22,
    11,
    34,
    17,
    52,
  ],
  "32": Array [
    64,
  ],
  "34": Array [
    22,
    11,
  ],
  "35": Array [
    23,
    70,
  ],
  "4": Array [
    64,
    32,
    16,
    8,
  ],
  "40": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
  ],
  "5": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
    40,
    20,
    10,
  ],
  "52": Array [
    22,
    11,
    34,
    17,
  ],
  "53": Array [
    23,
    70,
    35,
    106,
  ],
  "64": Array [],
  "7": Array [],
  "70": Array [
    23,
  ],
  "8": Array [
    64,
    32,
    16,
  ],
  "80": Array [
    23,
    70,
    35,
    106,
    53,
    160,
  ],
}
`

exports[`test/index.ts > TAP > async graph traversal > results 1`] = `
Object {
  "1": Array [
    64,
    32,
    16,
    8,
    4,
    2,
  ],
  "10": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
    40,
    20,
  ],
  "106": Array [
    23,
    70,
    35,
  ],
  "11": Array [
    22,
  ],
  "13": Array [
    22,
    11,
    34,
    17,
    52,
    26,
  ],
  "16": Array [
    64,
    32,
  ],
  "160": Array [
    23,
    70,
    35,
    106,
    53,
  ],
  "17": Array [
    22,
    11,
    34,
  ],
  "2": Array [
    64,
    32,
    16,
    8,
    4,
  ],
  "20": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
    40,
  ],
  "22": Array [],
  "23": Array [],
  "26": Array [
    22,
    11,
    34,
    17,
    52,
  ],
  "32": Array [
    64,
  ],
  "34": Array [
    22,
    11,
  ],
  "35": Array [
    23,
    70,
  ],
  "4": Array [
    64,
    32,
    16,
    8,
  ],
  "40": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
  ],
  "5": Array [
    23,
    70,
    35,
    106,
    53,
    160,
    80,
    40,
    20,
    10,
  ],
  "52": Array [
    22,
    11,
    34,
    17,
  ],
  "53": Array [
    23,
    70,
    35,
    106,
  ],
  "64": Array [],
  "7": Array [],
  "70": Array [
    23,
  ],
  "8": Array [
    64,
    32,
    16,
  ],
  "80": Array [
    23,
    70,
    35,
    106,
    53,
    160,
  ],
}
`

exports[`test/index.ts > TAP > async graph traversal > visited 1`] = `
Array [
  1,
  2,
  4,
  5,
  7,
  8,
  10,
  11,
  13,
  16,
  17,
  20,
  22,
  23,
  26,
  32,
  34,
  35,
  40,
  52,
  53,
  64,
  70,
  80,
  106,
  160,
]
`

exports[`test/index.ts > TAP > exploring various shapes > bush > cycles 1`] = `
Array [
  Array [
    "c",
    "bush->a->b",
    "b->c->b",
  ],
  Array [
    "d",
    "bush->a->b",
    "b->d->b",
  ],
  Array [
    "e",
    "bush->a->b",
    "b->e->b",
  ],
  Array [
    "f",
    "bush->a->b",
    "b->f->b",
  ],
  Array [
    "b",
    "bush->a->c",
    "c->b->c",
  ],
  Array [
    "d",
    "bush->a->c",
    "c->d->c",
  ],
  Array [
    "e",
    "bush->a->c",
    "c->e->c",
  ],
  Array [
    "f",
    "bush->a->c",
    "c->f->c",
  ],
  Array [
    "b",
    "bush->a->d",
    "d->b->d",
  ],
  Array [
    "c",
    "bush->a->d",
    "d->c->d",
  ],
  Array [
    "e",
    "bush->a->d",
    "d->e->d",
  ],
  Array [
    "f",
    "bush->a->d",
    "d->f->d",
  ],
  Array [
    "b",
    "bush->a->e",
    "e->b->e",
  ],
  Array [
    "c",
    "bush->a->e",
    "e->c->e",
  ],
  Array [
    "d",
    "bush->a->e",
    "e->d->e",
  ],
  Array [
    "f",
    "bush->a->e",
    "e->f->e",
  ],
  Array [
    "b",
    "bush->a->f",
    "f->b->f",
  ],
  Array [
    "c",
    "bush->a->f",
    "f->c->f",
  ],
  Array [
    "d",
    "bush->a->f",
    "f->d->f",
  ],
  Array [
    "e",
    "bush->a->f",
    "f->e->f",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > bush > visits 1`] = `
Array [
  Array [
    "g",
    Array [
      "bush",
      "a",
      "b",
    ],
    Object {},
  ],
  Array [
    "c",
    Array [
      "bush",
      "a",
    ],
    Object {
      "b": undefined,
      "c": undefined,
      "d": undefined,
      "e": undefined,
      "f": undefined,
      "g": "g",
    },
  ],
  Array [
    "d",
    Array [
      "bush",
      "a",
    ],
    Object {
      "b": undefined,
      "c": undefined,
      "d": undefined,
      "e": undefined,
      "f": undefined,
      "g": "g",
    },
  ],
  Array [
    "e",
    Array [
      "bush",
      "a",
    ],
    Object {
      "b": undefined,
      "c": undefined,
      "d": undefined,
      "e": undefined,
      "f": undefined,
      "g": "g",
    },
  ],
  Array [
    "f",
    Array [
      "bush",
      "a",
    ],
    Object {
      "b": undefined,
      "c": undefined,
      "d": undefined,
      "e": undefined,
      "f": undefined,
      "g": "g",
    },
  ],
  Array [
    "b",
    Array [
      "bush",
      "a",
    ],
    Object {
      "b": undefined,
      "c": "c",
      "d": "d",
      "e": "e",
      "f": "f",
      "g": "g",
    },
  ],
  Array [
    "a",
    Array [
      "bush",
    ],
    Object {
      "b": "b",
      "c": "c",
      "d": "d",
      "e": "e",
      "f": "f",
    },
  ],
  Array [
    "bush",
    Array [],
    Object {
      "a": "a",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > couple > cycles 1`] = `
Array [
  Array [
    "b",
    "couple->a",
    "a->b->a",
  ],
  Array [
    "a",
    "couple->b",
    "b->a->b",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > couple > visits 1`] = `
Array [
  Array [
    "a",
    Array [
      "couple",
    ],
    Object {
      "b": undefined,
    },
  ],
  Array [
    "b",
    Array [
      "couple",
    ],
    Object {
      "a": undefined,
    },
  ],
  Array [
    "couple",
    Array [],
    Object {
      "a": "a",
      "b": "b",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > diamond > cycles 1`] = `
Array []
`

exports[`test/index.ts > TAP > exploring various shapes > diamond > visits 1`] = `
Array [
  Array [
    "c",
    Array [
      "diamond",
      "a",
    ],
    Object {},
  ],
  Array [
    "b",
    Array [
      "diamond",
    ],
    Object {
      "c": "c",
    },
  ],
  Array [
    "a",
    Array [
      "diamond",
    ],
    Object {
      "c": "c",
    },
  ],
  Array [
    "diamond",
    Array [],
    Object {
      "a": "a",
      "b": "b",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > pyramid > cycles 1`] = `
Array [
  Array [
    "b",
    "pyramid->a",
    "a->b->a",
  ],
  Array [
    "c",
    "pyramid->a",
    "a->c->a",
  ],
  Array [
    "c",
    "pyramid->b",
    "b->c->b",
  ],
  Array [
    "a",
    "pyramid->b",
    "b->a->b",
  ],
  Array [
    "a",
    "pyramid->c",
    "c->a->c",
  ],
  Array [
    "b",
    "pyramid->c",
    "c->b->c",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > pyramid > visits 1`] = `
Array [
  Array [
    "a",
    Array [
      "pyramid",
    ],
    Object {
      "b": undefined,
      "c": undefined,
    },
  ],
  Array [
    "b",
    Array [
      "pyramid",
    ],
    Object {
      "a": undefined,
      "c": undefined,
    },
  ],
  Array [
    "c",
    Array [
      "pyramid",
    ],
    Object {
      "a": undefined,
      "b": undefined,
    },
  ],
  Array [
    "pyramid",
    Array [],
    Object {
      "a": "a",
      "b": "b",
      "c": "c",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > ring > cycles 1`] = `
Array [
  Array [
    "a",
    "ring->a->b->c->d->e->f->g->h",
    "h->a->b->c->d->e->f->g->h",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > ring > visits 1`] = `
Array [
  Array [
    "h",
    Array [
      "ring",
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
    ],
    Object {
      "a": undefined,
    },
  ],
  Array [
    "g",
    Array [
      "ring",
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ],
    Object {
      "h": "h",
    },
  ],
  Array [
    "f",
    Array [
      "ring",
      "a",
      "b",
      "c",
      "d",
      "e",
    ],
    Object {
      "g": "g",
    },
  ],
  Array [
    "e",
    Array [
      "ring",
      "a",
      "b",
      "c",
      "d",
    ],
    Object {
      "f": "f",
    },
  ],
  Array [
    "d",
    Array [
      "ring",
      "a",
      "b",
      "c",
    ],
    Object {
      "e": "e",
    },
  ],
  Array [
    "c",
    Array [
      "ring",
      "a",
      "b",
    ],
    Object {
      "d": "d",
    },
  ],
  Array [
    "b",
    Array [
      "ring",
      "a",
    ],
    Object {
      "c": "c",
    },
  ],
  Array [
    "a",
    Array [
      "ring",
    ],
    Object {
      "b": "b",
    },
  ],
  Array [
    "ring",
    Array [],
    Object {
      "a": "a",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > selfLink > cycles 1`] = `
Array []
`

exports[`test/index.ts > TAP > exploring various shapes > selfLink > visits 1`] = `
Array [
  Array [
    "selfLink",
    Array [],
    Object {
      "selfLink": undefined,
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > square > cycles 1`] = `
Array []
`

exports[`test/index.ts > TAP > exploring various shapes > square > visits 1`] = `
Array [
  Array [
    "c",
    Array [
      "square",
      "a",
    ],
    Object {},
  ],
  Array [
    "d",
    Array [
      "square",
      "a",
    ],
    Object {},
  ],
  Array [
    "b",
    Array [
      "square",
    ],
    Object {
      "c": "c",
      "d": "d",
    },
  ],
  Array [
    "a",
    Array [
      "square",
    ],
    Object {
      "c": "c",
      "d": "d",
    },
  ],
  Array [
    "square",
    Array [],
    Object {
      "a": "a",
      "b": "b",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > throuple > cycles 1`] = `
Array [
  Array [
    "c",
    "throuple->a->b",
    "b->c->b",
  ],
  Array [
    "a",
    "throuple->a->b",
    "b->a->b",
  ],
  Array [
    "a",
    "throuple->a->c",
    "c->a->c",
  ],
  Array [
    "b",
    "throuple->a->c",
    "c->b->c",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > throuple > visits 1`] = `
Array [
  Array [
    "b",
    Array [
      "throuple",
      "a",
    ],
    Object {
      "a": undefined,
      "c": undefined,
    },
  ],
  Array [
    "c",
    Array [
      "throuple",
      "a",
    ],
    Object {
      "a": undefined,
      "b": undefined,
    },
  ],
  Array [
    "a",
    Array [
      "throuple",
    ],
    Object {
      "b": "b",
      "c": "c",
    },
  ],
  Array [
    "throuple",
    Array [],
    Object {
      "a": "a",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > triangle > cycles 1`] = `
Array [
  Array [
    "a",
    "triangle->a->b->c",
    "c->a->b->c",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > triangle > visits 1`] = `
Array [
  Array [
    "c",
    Array [
      "triangle",
      "a",
      "b",
    ],
    Object {
      "a": undefined,
    },
  ],
  Array [
    "b",
    Array [
      "triangle",
      "a",
    ],
    Object {
      "c": "c",
    },
  ],
  Array [
    "a",
    Array [
      "triangle",
    ],
    Object {
      "b": "b",
    },
  ],
  Array [
    "triangle",
    Array [],
    Object {
      "a": "a",
    },
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > tripod > cycles 1`] = `
Array [
  Array [
    "c",
    "tripod->b",
    "b->c->a->b",
  ],
]
`

exports[`test/index.ts > TAP > exploring various shapes > tripod > visits 1`] = `
Array [
  Array [
    "b",
    Array [
      "tripod",
    ],
    Object {
      "c": undefined,
    },
  ],
  Array [
    "a",
    Array [
      "tripod",
    ],
    Object {
      "b": "b",
    },
  ],
  Array [
    "c",
    Array [
      "tripod",
    ],
    Object {
      "a": "a",
    },
  ],
  Array [
    "tripod",
    Array [],
    Object {
      "a": "a",
      "b": "b",
      "c": "c",
    },
  ],
]
`

exports[`test/index.ts > TAP > sync graph traversal > cycles 1`] = `
Array [
  Array [
    4,
    Array [
      1,
      4,
      2,
      1,
    ],
    Array [
      7,
      22,
      11,
      34,
      17,
      52,
      26,
      13,
      40,
      20,
      10,
      5,
      16,
      8,
      4,
      2,
      1,
    ],
  ],
]
`

exports[`test/index.ts > TAP > sync graph traversal > paths 1`] = `
Object {
  "1": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
    8,
    4,
    2,
  ],
  "10": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
  ],
  "106": Array [
    23,
    70,
    35,
  ],
  "11": Array [
    7,
    22,
  ],
  "13": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
  ],
  "16": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
  ],
  "160": Array [
    23,
    70,
    35,
    106,
    53,
  ],
  "17": Array [
    7,
    22,
    11,
    34,
  ],
  "2": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
    8,
    4,
  ],
  "20": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
  ],
  "22": Array [
    7,
  ],
  "23": Array [],
  "26": Array [
    7,
    22,
    11,
    34,
    17,
    52,
  ],
  "32": Array [
    64,
  ],
  "34": Array [
    7,
    22,
    11,
  ],
  "35": Array [
    23,
    70,
  ],
  "4": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
    8,
  ],
  "40": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
  ],
  "5": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
  ],
  "52": Array [
    7,
    22,
    11,
    34,
    17,
  ],
  "53": Array [
    23,
    70,
    35,
    106,
  ],
  "64": Array [],
  "7": Array [],
  "70": Array [
    23,
  ],
  "8": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
  ],
  "80": Array [
    23,
    70,
    35,
    106,
    53,
    160,
  ],
}
`

exports[`test/index.ts > TAP > sync graph traversal > results 1`] = `
Object {
  "1": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
    8,
    4,
    2,
  ],
  "10": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
  ],
  "106": Array [
    23,
    70,
    35,
  ],
  "11": Array [
    7,
    22,
  ],
  "13": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
  ],
  "16": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
  ],
  "160": Array [
    23,
    70,
    35,
    106,
    53,
  ],
  "17": Array [
    7,
    22,
    11,
    34,
  ],
  "2": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
    8,
    4,
  ],
  "20": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
  ],
  "22": Array [
    7,
  ],
  "23": Array [],
  "26": Array [
    7,
    22,
    11,
    34,
    17,
    52,
  ],
  "32": Array [
    64,
  ],
  "34": Array [
    7,
    22,
    11,
  ],
  "35": Array [
    23,
    70,
  ],
  "4": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
    8,
  ],
  "40": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
  ],
  "5": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
  ],
  "52": Array [
    7,
    22,
    11,
    34,
    17,
  ],
  "53": Array [
    23,
    70,
    35,
    106,
  ],
  "64": Array [],
  "7": Array [],
  "70": Array [
    23,
  ],
  "8": Array [
    7,
    22,
    11,
    34,
    17,
    52,
    26,
    13,
    40,
    20,
    10,
    5,
    16,
  ],
  "80": Array [
    23,
    70,
    35,
    106,
    53,
    160,
  ],
}
`

exports[`test/index.ts > TAP > sync graph traversal > visited 1`] = `
Array [
  1,
  2,
  4,
  5,
  7,
  8,
  10,
  11,
  13,
  16,
  17,
  20,
  22,
  23,
  26,
  32,
  34,
  35,
  40,
  52,
  53,
  64,
  70,
  80,
  106,
  160,
]
`
