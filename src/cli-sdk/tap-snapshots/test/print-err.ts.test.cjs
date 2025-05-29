/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/print-err.ts > TAP > snapshots > ECONFIG > code > output 1`] = `
Config Error: Invalid config keys
  Found: [ 'garbage' ]
  Wanted: string[]
  Valid Options: [ 'wanted' ]
`

exports[`test/print-err.ts > TAP > snapshots > ECONFIG > no code > output 1`] = `
Config Error: Invalid config keys
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > internal cause > file 1`] = `
Error: oh no! my request!
    at {STACK_LINE} {
  [cause]: {
    code: 'EREQUEST',
    url: URL {
      href: 'https://x.y/',
      origin: 'https://x.y',
      protocol: 'https:',
      username: '',
      password: '',
      host: 'x.y',
      hostname: 'x.y',
      port: '',
      pathname: '/',
      search: '',
      searchParams: URLSearchParams {},
      hash: ''
    },
    method: 'GET',
    cause: Error: some internal thing
        at {STACK_LINE} {
      code: 'ECONNRESET',
      syscall: 'read',
      cause: { code: 'ECONNRESET', syscall: 'read' }
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > internal cause > output 1`] = `
Request Error: oh no! my request!
  Code: ECONNRESET
  Syscall: read
  URL: https://x.y/
  Method: GET

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-EREQUEST-internal-cause/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > internal cause > output no file 1`] = `
Request Error: oh no! my request!
  Code: ECONNRESET
  Syscall: read
  URL: https://x.y/
  Method: GET
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > no cause > file 1`] = `
Error: oh no! my request!
    at {STACK_LINE} {
  [cause]: {
    code: 'EREQUEST',
    url: URL {
      href: 'https://x.y/',
      origin: 'https://x.y',
      protocol: 'https:',
      username: '',
      password: '',
      host: 'x.y',
      hostname: 'x.y',
      port: '',
      pathname: '/',
      search: '',
      searchParams: URLSearchParams {},
      hash: ''
    },
    method: 'GET'
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > no cause > output 1`] = `
Request Error: oh no! my request!
  URL: https://x.y/
  Method: GET

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-EREQUEST-no-cause/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > no cause > output no file 1`] = `
Request Error: oh no! my request!
  URL: https://x.y/
  Method: GET
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > with cause > file 1`] = `
Error: oh no! my request!
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE} {
  [cause]: { code: 'EREQUEST' }
}
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > with cause > output 1`] = `
Request Error: oh no! my request!

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-EREQUEST-with-cause/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > EREQUEST > with cause > output no file 1`] = `
Request Error: oh no! my request!
`

exports[`test/print-err.ts > TAP > snapshots > ERESOLVE > basic > file 1`] = `
Error: bloopy doop
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE}
    at {STACK_LINE} {
  [cause]: { code: 'ERESOLVE' }
}
`

exports[`test/print-err.ts > TAP > snapshots > ERESOLVE > basic > output 1`] = `
Resolve Error: bloopy doop

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-ERESOLVE-basic/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > ERESOLVE > basic > output no file 1`] = `
Resolve Error: bloopy doop
`

exports[`test/print-err.ts > TAP > snapshots > ERESOLVE > url > file 1`] = `
Error: bloopy doop
    at {STACK_LINE} {
  [cause]: {
    code: 'ERESOLVE',
    url: URL {
      href: 'https://x.y/',
      origin: 'https://x.y',
      protocol: 'https:',
      username: '',
      password: '',
      host: 'x.y',
      hostname: 'x.y',
      port: '',
      pathname: '/',
      search: '',
      searchParams: URLSearchParams {},
      hash: ''
    },
    spec: 'x@1.x',
    from: '/home/base',
    response: { statusCode: 200 }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > ERESOLVE > url > output 1`] = `
Resolve Error: bloopy doop
  While fetching: https://x.y/
  To satisfy: x@1.x
  From: /home/base
  Response: { statusCode: 200 }

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-ERESOLVE-url/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > ERESOLVE > url > output no file 1`] = `
Resolve Error: bloopy doop
  While fetching: https://x.y/
  To satisfy: x@1.x
  From: /home/base
  Response: { statusCode: 200 }
`

exports[`test/print-err.ts > TAP > snapshots > error with a missing code > file 1`] = `
Error: this is an error
    at {STACK_LINE} {
  [cause]: { found: 'wat' }
}
`

exports[`test/print-err.ts > TAP > snapshots > error with a missing code > output 1`] = `
Error: this is an error

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-error-with-a-missing-code/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > error-cause > file 1`] = `
Error: root error
    at {STACK_LINE} {
  [cause]: {
    code: 'EUNKNOWN',
    name: 'root error name',
    cause: Error: cause 1
        at {STACK_LINE} {
      [cause]: {
        name: 'cause 1 name',
        min: 100,
        cause: Error: cause 2
            at {STACK_LINE} {
          [cause]: {
            name: 'cause 2 name',
            max: 200,
            cause: Error: cause 3
                at {STACK_LINE} {
              [cause]: { name: 'cause 3 name', wanted: 'what' }
            }
          }
        }
      }
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > error-cause > output 1`] = `
Error: root error

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-error-cause/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > EUSAGE > basic > output 1`] = `
usage
Usage Error: bloopy doop
`

exports[`test/print-err.ts > TAP > snapshots > EUSAGE > validOptions > output 1`] = `
usage
Usage Error: bloopy doop
  Found: x
  Valid options: a, b
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error no stdio output > file 1`] = `
Error: failed graph traversal
    at {STACK_LINE} {
  [cause]: {
    code: 'GRAPHRUN_TRAVERSAL',
    node: { id: 'workspace·www§docs' },
    path: [],
    cause: Error: command failed
        at {STACK_LINE} {
      [cause]: {
        command: 'astro sync',
        args: [],
        stdout: '',
        stderr: '',
        cwd: '/some/path/to/www/docs',
        status: null,
        signal: 'SIGINT'
      }
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error no stdio output > output 1`] = `
Graph traversal failure at: workspace www/docs
Command: astro sync
Cwd: /some/path/to/www/docs
Signal: SIGINT

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-graph-run-error-no-stdio-output/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error no stdio output > output no file 1`] = `
Graph traversal failure at: workspace www/docs
Command: astro sync
Cwd: /some/path/to/www/docs
Signal: SIGINT
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error with stderr > file 1`] = `
Error: failed graph traversal
    at {STACK_LINE} {
  [cause]: {
    code: 'GRAPHRUN_TRAVERSAL',
    node: { id: 'workspace·www§docs' },
    path: [ { id: '··a@1.2.3' } ],
    cause: Error: command failed
        at {STACK_LINE} {
      [cause]: {
        command: 'astro sync',
        args: [ 'x' ],
        stdout: '',
        stderr: 'error message',
        cwd: '/some/path/to/www/docs',
        status: 1,
        signal: null
      }
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error with stderr > output 1`] = `
Graph traversal failure at: workspace www/docs
  Path: ··a@1.2.3
Command: astro sync
Args: "x"
Cwd: /some/path/to/www/docs

error message

Status: 1

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-graph-run-error-with-stderr/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error with stderr > output no file 1`] = `
Graph traversal failure at: workspace www/docs
  Path: ··a@1.2.3
Command: astro sync
Args: "x"
Cwd: /some/path/to/www/docs

error message

Status: 1
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error with stdout > file 1`] = `
Error: failed graph traversal
    at {STACK_LINE} {
  [cause]: {
    code: 'GRAPHRUN_TRAVERSAL',
    node: { id: 'workspace·www§docs' },
    path: [ { id: '··a@1.2.3' } ],
    cause: Error: command failed
        at {STACK_LINE} {
      [cause]: {
        command: 'astro sync',
        args: [ 'x' ],
        stdout: 'output message',
        stderr: '',
        cwd: '/some/path/to/www/docs',
        status: 1,
        signal: null
      }
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error with stdout > output 1`] = `
Graph traversal failure at: workspace www/docs
  Path: ··a@1.2.3
Command: astro sync
Args: "x"
Cwd: /some/path/to/www/docs

output message

Status: 1

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-graph-run-error-with-stdout/vlt/error-logs/error-123.log
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error with stdout > output no file 1`] = `
Graph traversal failure at: workspace www/docs
  Path: ··a@1.2.3
Command: astro sync
Args: "x"
Cwd: /some/path/to/www/docs

output message

Status: 1
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error without spawn error > file 1`] = `
Error: failed graph traversal
    at {STACK_LINE} {
  [cause]: {
    code: 'GRAPHRUN_TRAVERSAL',
    node: { id: 'workspace·www§docs' },
    path: []
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > graph-run error without spawn error > output 1`] = `
Error: failed graph traversal

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-graph-run-error-without-spawn-error/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > native error causes > file 1`] = `
Error: root error
    at {STACK_LINE} {
  [cause]: Error: cause 1
      at {STACK_LINE} {
    [cause]: Error: cause 2
        at {STACK_LINE} {
      [cause]: Error: cause 3
          at {STACK_LINE} {
        [cause]: { arbitrary: 'thing' }
      }
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > native error causes > output 1`] = `
Error: root error

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-native-error-causes/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > not an error > file 1`] = `
false
`

exports[`test/print-err.ts > TAP > snapshots > not an error > output 1`] = `

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-not-an-error/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > regular error with cause > file 1`] = `
Error: foo bar
    at {STACK_LINE} {
  [cause]: { this_is_why_i_errored: true }
}
`

exports[`test/print-err.ts > TAP > snapshots > regular error with cause > output 1`] = `
Error: foo bar

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-regular-error-with-cause/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > regular error with no cause > file 1`] = `
Error: foo bar
    at {STACK_LINE}
`

exports[`test/print-err.ts > TAP > snapshots > regular error with no cause > output 1`] = `
Error: foo bar

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-regular-error-with-no-cause/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > regular error with regular error cause > file 1`] = `
Error: foo bar
    at {STACK_LINE} {
  [cause]: Error: this_is_why_i_errored
      at {STACK_LINE}
}
`

exports[`test/print-err.ts > TAP > snapshots > regular error with regular error cause > output 1`] = `
Error: foo bar

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-regular-error-with-regular-error-cause/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > regular error with weird cause > file 1`] = `
Error: foo bar
    at {STACK_LINE} {
  [cause]: false
}
`

exports[`test/print-err.ts > TAP > snapshots > regular error with weird cause > output 1`] = `
Error: foo bar

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-regular-error-with-weird-cause/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > unknown code and max lines > file 1`] = `
Error: this is an error
    at {STACK_LINE} {
  [cause]: {
    code: 'ENOTACODEWEKNOWABOUT',
    wanted: {
      __0__: 0,
      __1__: 1,
      __2__: 2,
      __3__: 3,
      __4__: 4,
      __5__: 5,
      __6__: 6,
      __7__: 7,
      __8__: 8,
      __9__: 9,
      __10__: 10,
      __11__: 11,
      __12__: 12,
      __13__: 13,
      __14__: 14,
      __15__: 15,
      __16__: 16,
      __17__: 17,
      __18__: 18,
      __19__: 19
    }
  }
}
`

exports[`test/print-err.ts > TAP > snapshots > unknown code and max lines > output 1`] = `
Error: this is an error

Full details written to: {CWD}/.tap/fixtures/test-print-err.ts-snapshots-unknown-code-and-max-lines/vlt/error-logs/error-123.log

Open an issue with the full error details at:
  https://github.com/vltpkg/vltpkg/issues/new
`

exports[`test/print-err.ts > TAP > snapshots > unknown code and max lines > output no file 1`] = `
Error: this is an error
    at {STACK_LINE} {
  [cause]: {
    code: 'ENOTACODEWEKNOWABOUT',
    wanted: {
... 23 lines hidden ...
`
