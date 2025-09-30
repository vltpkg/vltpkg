/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > invalid config in file > must match snapshot 1`] = `
Problem in Config File {CWD}/.tap/fixtures/test-index.ts-invalid-config-in-file/vlt.json
Invalid value string for color, expected boolean
  Field: color
  Found: "foo"
  Wanted: boolean
  Run 'vlt help' for more information about available options.
`

exports[`test/index.ts > TAP > invalid workspace - no vlt.json > must match snapshot 1`] = `
Error: No matching workspaces found. Make sure the vlt.json config contains the correct workspaces.
  Workspace: [ 'src/bar' ]
`

exports[`test/index.ts > TAP > invalid workspace > must match snapshot 1`] = `
Error: No matching workspaces found. Make sure the vlt.json config contains the correct workspaces.
  Workspace: [ 'src/bar' ]
`

exports[`test/index.ts > TAP > invalid workspace-group > must match snapshot 1`] = `
Error: No matching workspaces found. Make sure the vlt.json config contains the correct workspaces.
  Workspace Group: [ 'a' ]
`

exports[`test/index.ts > TAP > unknown config > must match snapshot 1`] = `
Invalid Option Flag
Unknown option '--unknown'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- --unknown'
  Found: --unknown
  Valid Options:
    --access=<access>
    --arch=<arch>
    --bail
    --before=<date>
    --cache=<path>
    --color
    --config=<all | user | project>
    --dashboard-root=<path>
    --dry-run
    --editor=<program>
    --expect-lockfile
    --expect-results=<value>
    --fallback-command=<command>
    --fetch-retries=<n>
    --fetch-retry-factor=<n>
    --fetch-retry-maxtimeout=<n>
    --fetch-retry-mintimeout=<n>
    --frozen-lockfile
    --git-host-archives=<name=template>
    --git-hosts=<name=template>
    --git-shallow
    --help
    --identity=<name>
    --if-present
    --jsr-registries=<name=url>
    --no-bail
    --no-color
    --node-version=<version>
    --os=<os>
    --otp=<otp>
    --package=<p>
    --port=<number>
    --publish-directory=<path>
    --recursive
    --registries=<name=url>
    --registry=<url>
    --registry-port=<number>
    --save-dev
    --save-optional
    --save-peer
    --save-prod
    --scope=<scope>
    --scope-registries=<@scope=url>
    --script-shell=<program>
    --stale-while-revalidate-factor=<n>
    --tag=<tag>
    --target=<target>
    --version
    --view=<output>
    --workspace=<ws>
    --workspace-group=<workspace-group>
    --yes
  Run 'vlt help' for more information about available options.
`

exports[`test/index.ts > TAP > unknown config in file > must match snapshot 1`] = `
Problem in Config File {CWD}/.tap/fixtures/test-index.ts-unknown-config-in-file/vlt.json
Unknown config option: asdf
  Found: "asdf"
  Valid Options:
    access
    arch
    bail
    before
    cache
    color
    config
    dashboard-root
    dry-run
    editor
    expect-lockfile
    expect-results
    fallback-command
    fetch-retries
    fetch-retry-factor
    fetch-retry-maxtimeout
    fetch-retry-mintimeout
    frozen-lockfile
    git-host-archives
    git-hosts
    git-shallow
    help
    identity
    if-present
    jsr-registries
    no-bail
    no-color
    node-version
    os
    otp
    package
    port
    publish-directory
    recursive
    registries
    registry
    registry-port
    save-dev
    save-optional
    save-peer
    save-prod
    scope
    scope-registries
    script-shell
    stale-while-revalidate-factor
    tag
    target
    version
    view
    workspace
    workspace-group
    yes
  Run 'vlt help' for more information about available options.
`
