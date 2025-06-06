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

exports[`test/index.ts > TAP > unknown config > must match snapshot 1`] = `
Invalid Option Flag
Unknown option '--unknown'. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- --unknown'
  Found: --unknown
  Valid Options:
    --arch=<arch>
    --bail
    --before=<date>
    --cache=<path>
    --color
    --config=<user | project>
    --dashboard-root=<path>
    --editor=<program>
    --expect-results=<value>
    --fallback-command=<command>
    --fetch-retries=<n>
    --fetch-retry-factor=<n>
    --fetch-retry-maxtimeout=<n>
    --fetch-retry-mintimeout=<n>
    --git-host-archives=<name=template>
    --git-hosts=<name=template>
    --git-shallow
    --help
    --identity=<name>
    --jsr-registries=<name=url>
    --no-bail
    --no-color
    --node-version=<version>
    --os=<os>
    --package=<p>
    --query=<query>
    --recursive
    --registries=<name=url>
    --registry=<url>
    --save-dev
    --save-optional
    --save-peer
    --save-prod
    --scope-registries=<@scope=url>
    --script-shell=<program>
    --stale-while-revalidate-factor=<n>
    --tag=<tag>
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
    arch
    bail
    before
    cache
    color
    config
    dashboard-root
    editor
    expect-results
    fallback-command
    fetch-retries
    fetch-retry-factor
    fetch-retry-maxtimeout
    fetch-retry-mintimeout
    git-host-archives
    git-hosts
    git-shallow
    help
    identity
    jsr-registries
    no-bail
    no-color
    node-version
    os
    package
    query
    recursive
    registries
    registry
    save-dev
    save-optional
    save-peer
    save-prod
    scope-registries
    script-shell
    stale-while-revalidate-factor
    tag
    version
    view
    workspace
    workspace-group
    yes
  Run 'vlt help' for more information about available options.
`
