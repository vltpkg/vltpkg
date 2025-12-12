![vlt](https://github.com/user-attachments/assets/aec7c817-b83f-4d71-b34a-4e480b97e82c)

# vlt /vōlt/

![vlt Version](https://img.shields.io/npm/v/vlt?logo=npm&label=Version)
![Package Downloads](https://img.shields.io/npm/dm/vlt?logo=npm&label=Downloads)
![GitHub Branch Status](https://img.shields.io/github/checks-status/vltpkg/vltpkg/main?logo=github&label=GitHub)
![Discord Server Status](https://img.shields.io/discord/1093366081067954178?logo=discord&label=Discord)
[![Socket Security Status](https://socket.dev/api/badge/npm/package/vlt)](https://socket.dev/npm/package/vlt)

**Develop. Run. Distribute.**

This is the source monorepo for the [vlt](https://www.vlt.sh) package
manager.

### Documentation

Full documentation, startup guides & API references can be found at
[docs.vlt.sh](https://docs.vlt.sh).

#### Development

```bash
# Clone the repo
git clone git@github.com:vltpkg/vltpkg.git
cd vltpkg

# Install deps (and run prepare scripts)
pnpm install

# Run the locally built CLI
pnpm vlt # OR ./node_modules/.bin/vlt
```

See the [contributing guide](./CONTRIBUTING.md) for more information
on how to build and develop the various workspaces.

### Contributors

<a href="https://github.com/vltpkg/vltpkg/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=vltpkg/vltpkg" />
</a>

### Licenses

Below you can find a complete table of each workspace available in
this repository and its corresponding license:

#### Reusable Client Internals (`src/*`)

| Workspace Name                                     | License                                               | Downloads                                                                         |
| -------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| [@vltpkg/cache](./src/cache)                       | [BSD-2-Clause-Patent](./src/cache/LICENSE)            | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cache?logo=npm)            |
| [@vltpkg/cache-unzip](./src/cache-unzip)           | [BSD-2-Clause-Patent](./src/cache-unzip/LICENSE)      | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cache-unzip?logo=npm)      |
| [@vltpkg/cli-sdk](./src/cli-sdk)                   | [BSD-2-Clause-Patent](./src/cli-sdk/LICENSE)          | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-sdk?logo=npm)          |
| [@vltpkg/cmd-shim](./src/cmd-shim)                 | [BSD-2-Clause-Patent](./src/cmd-shim/LICENSE)         | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cmd-shim?logo=npm)         |
| [@vltpkg/config](./src/config)                     | [BSD-2-Clause-Patent](./src/config/LICENSE)           | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/config?logo=npm)           |
| [@vltpkg/dep-id](./src/dep-id)                     | [BSD-2-Clause-Patent](./src/dep-id/LICENSE)           | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/dep-id?logo=npm)           |
| [@vltpkg/dot-prop](./src/dot-prop)                 | [MIT](./src/dot-prop/LICENSE)                         | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/dot-prop?logo=npm)         |
| [@vltpkg/dss-breadcrumb](./src/dss-breadcrumb)     | [BSD-2-Clause-Patent](./src/dss-breadcrumb/LICENSE)   | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/dss-breadcrumb?logo=npm)   |
| [@vltpkg/dss-parser](./src/dss-parser)             | [BSD-2-Clause-Patent](./src/dss-parser/LICENSE)       | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/dss-parser?logo=npm)       |
| [@vltpkg/error-cause](./src/error-cause)           | [BSD-2-Clause-Patent](./src/error-cause/LICENSE)      | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/error-cause?logo=npm)      |
| [@vltpkg/fast-split](./src/fast-split)             | [BSD-2-Clause-Patent](./src/fast-split/LICENSE)       | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/fast-split?logo=npm)       |
| [@vltpkg/git](./src/git)                           | [ISC](./src/git/LICENSE)                              | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/git?logo=npm)              |
| [@vltpkg/git-scp-url](./src/git-scp-url)           | [BSD-2-Clause-Patent](./src/git-scp-url/LICENSE)      | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/git-scp-url?logo=npm)      |
| [@vltpkg/graph](./src/graph)                       | [BSD-2-Clause-Patent](./src/graph/LICENSE)            | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/graph?logo=npm)            |
| [@vltpkg/graph-run](./src/graph-run)               | [BSD-2-Clause-Patent](./src/graph-run/LICENSE)        | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/graph-run?logo=npm)        |
| [@vltpkg/gui](./src/gui)                           | [FSL-1.1-MIT](./src/gui/LICENSE.md)                   | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/gui?logo=npm)              |
| [@vltpkg/init](./src/init)                         | [BSD-2-Clause-Patent](./src/init/LICENSE)             | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/init?logo=npm)             |
| [@vltpkg/keychain](./src/keychain)                 | [BSD-2-Clause-Patent](./src/keychain/LICENSE)         | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/keychain?logo=npm)         |
| [@vltpkg/output](./src/output)                     | [BSD-2-Clause-Patent](./src/output/LICENSE)           | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/output?logo=npm)           |
| [@vltpkg/package-info](./src/package-info)         | [BSD-2-Clause-Patent](./src/package-info/LICENSE)     | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/package-info?logo=npm)     |
| [@vltpkg/package-json](./src/package-json)         | [BSD-2-Clause-Patent](./src/package-json/LICENSE)     | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/package-json?logo=npm)     |
| [@vltpkg/pick-manifest](./src/pick-manifest)       | [BSD-2-Clause-Patent](./src/pick-manifest/LICENSE)    | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/pick-manifest?logo=npm)    |
| [@vltpkg/promise-spawn](./src/promise-spawn)       | [ISC](./src/promise-spawn/LICENSE)                    | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/promise-spawn?logo=npm)    |
| [@vltpkg/query](./src/query)                       | [BSD-2-Clause-Patent](./src/query/LICENSE)            | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/query?logo=npm)            |
| [@vltpkg/registry-client](./src/registry-client)   | [BSD-2-Clause-Patent](./src/registry-client/LICENSE)  | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/registry-client?logo=npm)  |
| [@vltpkg/rollback-remove](./src/rollback-remove)   | [BSD-2-Clause-Patent](./src/rollback-remove/LICENSE)  | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/rollback-remove?logo=npm)  |
| [@vltpkg/run](./src/run)                           | [BSD-2-Clause-Patent](./src/run/LICENSE)              | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/run?logo=npm)              |
| [@vltpkg/satisfies](./src/satisfies)               | [BSD-2-Clause-Patent](./src/satisfies/LICENSE)        | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/satisfies?logo=npm)        |
| [@vltpkg/security-archive](./src/security-archive) | [BSD-2-Clause-Patent](./src/security-archive/LICENSE) | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/security-archive?logo=npm) |
| [@vltpkg/semver](./src/semver)                     | [BSD-2-Clause-Patent](./src/semver/LICENSE)           | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/semver?logo=npm)           |
| [@vltpkg/server](./src/server)                     | [BSD-2-Clause-Patent](./src/server/LICENSE)           | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/server?logo=npm)           |
| [@vltpkg/spec](./src/spec)                         | [BSD-2-Clause-Patent](./src/spec/LICENSE)             | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/spec?logo=npm)             |
| [@vltpkg/tar](./src/tar)                           | [BSD-2-Clause-Patent](./src/tar/LICENSE)              | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/tar?logo=npm)              |
| [@vltpkg/types](./src/types)                       | [BSD-2-Clause-Patent](./src/types/LICENSE)            | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/types?logo=npm)            |
| [@vltpkg/url-open](./src/url-open)                 | [BSD-2-Clause-Patent](./src/url-open/LICENSE)         | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/url-open?logo=npm)         |
| [@vltpkg/vlt-json](./src/vlt-json)                 | [BSD-2-Clause-Patent](./src/vlt-json/LICENSE)         | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/vlt-json?logo=npm)         |
| [@vltpkg/vlx](./src/vlx)                           | [BSD-2-Clause-Patent](./src/vlx/LICENSE)              | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/vlx?logo=npm)              |
| [@vltpkg/vsr](./src/registry)                      | [FSL-1.1-MIT](./src/registry/LICENSE)                 | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/vsr?logo=npm)              |
| [@vltpkg/which](./src/which)                       | [ISC](./src/which/LICENSE)                            | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/which?logo=npm)            |
| [@vltpkg/workspaces](./src/workspaces)             | [BSD-2-Clause-Patent](./src/workspaces/LICENSE)       | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/workspaces?logo=npm)       |
| [@vltpkg/xdg](./src/xdg)                           | [BSD-2-Clause-Patent](./src/xdg/LICENSE)              | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/xdg?logo=npm)              |

#### Infrastructure (`infra/*`)

| Workspace Name                                       | License                                                 | Downloads                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [@vltpkg/benchmark](./infra/benchmark)               | [BSD-2-Clause-Patent](./infra/benchmark/LICENSE)        | N/A                                                                               |
| [@vltpkg/infra-build](./infra/build)                 | [BSD-2-Clause-Patent](./infra/build/LICENSE)            | N/A                                                                               |
| [vlt](./infra/cli)                                   | [BSD-2-Clause-Patent](./infra/cli/LICENSE)              | ![NPM Downloads](https://img.shields.io/npm/dm/vlt?logo=npm)                      |
| [@vltpkg/cli-compiled](./infra/cli-compiled)         | [BSD-2-Clause-Patent](./infra/cli-compiled/LICENSE)     | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-compiled?logo=npm)     |
| [@vltpkg/cli-darwin-arm64](./infra/cli-darwin-arm64) | [BSD-2-Clause-Patent](./infra/cli-darwin-arm64/LICENSE) | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-darwin-arm64?logo=npm) |
| [@vltpkg/cli-darwin-x64](./infra/cli-darwin-x64)     | [BSD-2-Clause-Patent](./infra/cli-darwin-x64/LICENSE)   | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-darwin-x64?logo=npm)   |
| [@vltpkg/cli-js](./infra/cli-js)                     | [BSD-2-Clause-Patent](./infra/cli-js/LICENSE)           | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-js?logo=npm)           |
| [@vltpkg/cli-linux-arm64](./infra/cli-linux-arm64)   | [BSD-2-Clause-Patent](./infra/cli-linux-arm64/LICENSE)  | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-linux-arm64?logo=npm)  |
| [@vltpkg/cli-linux-x64](./infra/cli-linux-x64)       | [BSD-2-Clause-Patent](./infra/cli-linux-x64/LICENSE)    | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-linux-x64?logo=npm)    |
| [@vltpkg/cli-win32-x64](./infra/cli-win32-x64)       | [BSD-2-Clause-Patent](./infra/cli-win32-x64/LICENSE)    | ![NPM Downloads](https://img.shields.io/npm/dm/@vltpkg/cli-win32-x64?logo=npm)    |
| [@vltpkg/smoke-test](./infra/smoke-test)             | [BSD-2-Clause-Patent](./infra/smoke-test/LICENSE)       | N/A                                                                               |

#### Documentation (`www/*`)

| Workspace Name             | License                                   |
| -------------------------- | ----------------------------------------- |
| [@vltpkg/docs](./www/docs) | [BSD-2-Clause-Patent](./www/docs/LICENSE) |
