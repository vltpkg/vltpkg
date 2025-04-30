/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/human-readable-output.ts > TAP > actual graph > colors > should use colors 1`] = `
[0mmy-project
├── link (linked@1.0.0)
├── foo@1.0.0
├── extraneous@1.0.0
├─┬ bar@1.0.0
│ ├── blooo@1.0.0
│ └── baz (custom:baz@1.0.0)
├── aliased (custom:foo@1.0.0)
├─┬ @scoped/b@1.0.0
│ └── @scoped/c@1.0.0
├── @scoped/a@1.0.0
└── missing@^1.0.0 [31m(missing)[39m
workspace-b
workspace-a
├── workspace-b@1.0.0
├── ipsum@1.0.0
└── foo@1.0.0
[0m
`

exports[`test/visualization/human-readable-output.ts > TAP > actual graph > selected packages > should print selected packages 1`] = `
my-project
└─┬ bar@1.0.0
  └── baz (custom:baz@1.0.0)

`

exports[`test/visualization/human-readable-output.ts > TAP > actual graph > should print from an actual loaded graph 1`] = `
my-project
├── link (linked@1.0.0)
├── foo@1.0.0
├── extraneous@1.0.0
├─┬ bar@1.0.0
│ ├── blooo@1.0.0
│ └── baz (custom:baz@1.0.0)
├── aliased (custom:foo@1.0.0)
├─┬ @scoped/b@1.0.0
│ └── @scoped/c@1.0.0
├── @scoped/a@1.0.0
└── missing@^1.0.0 (missing)
workspace-b
workspace-a
├── workspace-b@1.0.0
├── ipsum@1.0.0
└── foo@1.0.0

`

exports[`test/visualization/human-readable-output.ts > TAP > aliased package > should print both edge and node names 1`] = `
my-project
└── a (npm:@myscope/foo@1.0.0)

`

exports[`test/visualization/human-readable-output.ts > TAP > confused package > should print both spec and manifest names when they differ 1`] = `
my-project
└── different-name (confused)

`

exports[`test/visualization/human-readable-output.ts > TAP > cycle > should print cycle human readable output 1`] = `
my-project
└─┬ a@1.0.0
  └─┬ b@1.0.0
    └── a@1.0.0

`

exports[`test/visualization/human-readable-output.ts > TAP > human-readable-output > should print human readable output 1`] = `
my-project
├── foo@1.0.0
├─┬ bar@1.0.0
│ ├─┬ baz (custom:baz@1.0.0)
│ │ └── foo@1.0.0
│ └── extraneous@1.0.0
└── missing@^1.0.0 (missing)

`

exports[`test/visualization/human-readable-output.ts > TAP > missing optional > colors > should use colors 1`] = `
[0mmy-project
└── a@^1.0.0 [2m(missing optional)[22m
[0m
`

exports[`test/visualization/human-readable-output.ts > TAP > missing optional > should print missing optional package 1`] = `
my-project
└── a@^1.0.0 (missing optional)

`

exports[`test/visualization/human-readable-output.ts > TAP > nameless package > should fallback to printing package id if name is missing 1`] = `
file·.

`

exports[`test/visualization/human-readable-output.ts > TAP > versionless package > should skip printing version number 1`] = `
my-project
└── a@^1.0.0

`

exports[`test/visualization/human-readable-output.ts > TAP > workspaces > should print human readable workspaces output 1`] = `
my-project
b
a

`
