/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/human.ts > TAP > every mutation kind renders > human output 1`] = `
LOCKFILE DIFF

  8 -> 9 packages    5 -> 5 edges
  1 added   1 removed   3 resolved   1 modified
  options changed: registry

.
  ^ up  1.0.0 -> 2.0.0  transitive
  v down  2.0.0 -> 1.0.0  transitive
  - gone 1.0.0  transitive
  + fresh 1.0.0  transitive
  - ~npm~app@1.0.0 dropped *
  > ~npm~app@1.0.0 moved  ~npm~up@1.0.0 -> ~npm~down@1.0.0
  ~ ~npm~app@1.0.0 spec-only  spec, type
  > ~npm~app@1.0.0 nothing  MISSING -> ~npm~app@1.0.0
  + ~npm~app@1.0.0 added *

unreachable
  ~ touched 1.0.0  changed: integrity  transitive
  = peers 1.0.0  peer-set peer.1 -> peer.9  transitive
  = shuffled 1.0.0 1 peer variant(s) -> 2  transitive
  > side  x -> y  transitive

`

exports[`test/human.ts > TAP > versionless ids in every renderer branch > versionless output 1`] = `
LOCKFILE DIFF

  3 -> 4 packages    0 -> 0 edges
  0 added   0 removed   1 resolved   0 modified

unreachable
  = tagged  modifier  ->  transitive
  = peers  1 peer variant(s) -> 2  transitive
  > moved  ? -> ?  transitive

`
