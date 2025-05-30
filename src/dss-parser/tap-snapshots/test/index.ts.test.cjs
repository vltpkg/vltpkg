/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > parse > should clean up usage of combinators params in pseudo selectors that accept only string values 1`] = `
Array [
  Object {
    "source": Object {
      "end": Object {
        "column": 6,
        "line": 1,
      },
      "start": Object {
        "column": 1,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 6,
        "line": 1,
      },
      "start": Object {
        "column": 1,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":v",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 6,
        "line": 1,
      },
      "start": Object {
        "column": 4,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 5,
        "line": 1,
      },
      "start": Object {
        "column": 4,
        "line": 1,
      },
    },
    "type": "tag",
    "value": ">2",
  },
]
`

exports[`test/index.ts > TAP > parse > should clean up usage of multiple pseudo selectors requiring cleaning up 1`] = `
Array [
  Object {
    "source": Object {
      "end": Object {
        "column": 129,
        "line": 1,
      },
      "start": Object {
        "column": 1,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 5,
        "line": 1,
      },
      "start": Object {
        "column": 1,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":root",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 7,
        "line": 1,
      },
      "start": Object {
        "column": 7,
        "line": 1,
      },
    },
    "type": "combinator",
    "value": ">",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 20,
        "line": 1,
      },
      "start": Object {
        "column": 9,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":v",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 20,
        "line": 1,
      },
      "start": Object {
        "column": 12,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 19,
        "line": 1,
      },
      "start": Object {
        "column": 12,
        "line": 1,
      },
    },
    "type": "tag",
    "value": ">1 >2 >3",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 58,
        "line": 1,
      },
      "start": Object {
        "column": 21,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":not",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 58,
        "line": 1,
      },
      "start": Object {
        "column": 26,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 57,
        "line": 1,
      },
      "start": Object {
        "column": 26,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":v",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 57,
        "line": 1,
      },
      "start": Object {
        "column": 29,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 56,
        "line": 1,
      },
      "start": Object {
        "column": 29,
        "line": 1,
      },
    },
    "type": "tag",
    "value": "2.0.0-pre+build0.13adsfa1",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 60,
        "line": 1,
      },
      "start": Object {
        "column": 60,
        "line": 1,
      },
    },
    "type": "combinator",
    "value": ">",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 70,
        "line": 1,
      },
      "start": Object {
        "column": 62,
        "line": 1,
      },
    },
    "type": "tag",
    "value": "published(<=2024-01-01T11:11:11.111Z)",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 100,
        "line": 1,
      },
      "start": Object {
        "column": 100,
        "line": 1,
      },
    },
    "type": "combinator",
    "value": " ",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 114,
        "line": 1,
      },
      "start": Object {
        "column": 101,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":severity",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 114,
        "line": 1,
      },
      "start": Object {
        "column": 111,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 114,
        "line": 1,
      },
      "start": Object {
        "column": 111,
        "line": 1,
      },
    },
    "type": "tag",
    "value": ">=0",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 129,
        "line": 1,
      },
      "start": Object {
        "column": 115,
        "line": 1,
      },
    },
    "type": "pseudo",
    "value": ":score",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 129,
        "line": 1,
      },
      "start": Object {
        "column": 122,
        "line": 1,
      },
    },
    "type": "selector",
  },
  Object {
    "source": Object {
      "end": Object {
        "column": 128,
        "line": 1,
      },
      "start": Object {
        "column": 123,
        "line": 1,
      },
    },
    "type": "tag",
    "value": " > 0.9",
  },
]
`
