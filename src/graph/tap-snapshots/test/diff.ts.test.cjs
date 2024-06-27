/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/diff.ts > TAP > diff two graphs > diff no color 1`] = `
@vltpkg/graph.Diff {
  - ;;a@1.0.0
  + ;;b@1.0.0
  + ;;b@1.0.0 prod c@^1.0.0 ;;c@1.0.0
  + ;;bar@1.0.0 optional ooo@^1.0.1 ;;ooo@1.0.1
  - ;;bar@1.0.0 prod baz@^1.0.0 ;;baz@1.0.0
  + ;;bar@1.0.0 prod baz@^1.0.1 ;;baz@1.0.1
  - ;;baz@1.0.0
  + ;;baz@1.0.1
  + ;;c@1.0.0
  + ;;foo@1.0.0
  - ;;foo@1.0.0
  + ;;ooo@1.0.1
  - file;. prod a@^1.0.0 ;;a@1.0.0
  + file;. prod b@^1.0.0 ;;b@1.0.0
}
`

exports[`test/diff.ts > TAP > diff two graphs > diff with color 1`] = `
@vltpkg/graph.Diff {
  [31m- ;;a@1.0.0[m
  [32m+ ;;b@1.0.0[m
  [32m+ ;;b@1.0.0 prod c@^1.0.0 ;;c@1.0.0[m
  [32m+ ;;bar@1.0.0 optional ooo@^1.0.1 ;;ooo@1.0.1[m
  [31m- ;;bar@1.0.0 prod baz@^1.0.0 ;;baz@1.0.0[m
  [32m+ ;;bar@1.0.0 prod baz@^1.0.1 ;;baz@1.0.1[m
  [31m- ;;baz@1.0.0[m
  [32m+ ;;baz@1.0.1[m
  [32m+ ;;c@1.0.0[m
  [32m+ ;;foo@1.0.0[m
  [31m- ;;foo@1.0.0[m
  [32m+ ;;ooo@1.0.1[m
  [31m- file;. prod a@^1.0.0 ;;a@1.0.0[m
  [32m+ file;. prod b@^1.0.0 ;;b@1.0.0[m
}
`
