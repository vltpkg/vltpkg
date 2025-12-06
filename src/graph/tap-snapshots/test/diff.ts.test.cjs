/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/diff.ts > TAP > diff two graphs > diff no color 1`] = `
@vltpkg/graph.Diff {
  - ·npm·a@1.0.0
  + ·npm·b@1.0.0
  + ·npm·b@1.0.0 prod c@^1.0.0 ·npm·c@1.0.0
  + ·npm·bar@1.0.0 optional ooo@^1.0.1 ·npm·ooo@1.0.1
  - ·npm·bar@1.0.0 prod baz@^1.0.0 ·npm·baz@1.0.0
  + ·npm·bar@1.0.0 prod baz@^1.0.1 ·npm·baz@1.0.1
  - ·npm·baz@1.0.0
  + ·npm·baz@1.0.1
  + ·npm·c@1.0.0
  + ·npm·foo@1.0.0
  - ·npm·foo@1.0.0
  + ·npm·ooo@1.0.1
  - file·. prod a@^1.0.0 ·npm·a@1.0.0
  + file·. prod b@^1.0.0 ·npm·b@1.0.0
}
`

exports[`test/diff.ts > TAP > diff two graphs > diff with color 1`] = `
@vltpkg/graph.Diff {
  [31m- ·npm·a@1.0.0[m
  [32m+ ·npm·b@1.0.0[m
  [32m+ ·npm·b@1.0.0 prod c@^1.0.0 ·npm·c@1.0.0[m
  [32m+ ·npm·bar@1.0.0 optional ooo@^1.0.1 ·npm·ooo@1.0.1[m
  [31m- ·npm·bar@1.0.0 prod baz@^1.0.0 ·npm·baz@1.0.0[m
  [32m+ ·npm·bar@1.0.0 prod baz@^1.0.1 ·npm·baz@1.0.1[m
  [31m- ·npm·baz@1.0.0[m
  [32m+ ·npm·baz@1.0.1[m
  [32m+ ·npm·c@1.0.0[m
  [32m+ ·npm·foo@1.0.0[m
  [31m- ·npm·foo@1.0.0[m
  [32m+ ·npm·ooo@1.0.1[m
  [31m- file·. prod a@^1.0.0 ·npm·a@1.0.0[m
  [32m+ file·. prod b@^1.0.0 ·npm·b@1.0.0[m
}
`
