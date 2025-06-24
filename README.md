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

### Licenses

Below you can find a complete table of each workspace available in
this repository and its corresponding license:

#### Reusable Client Internals (`src/*`)

| Workspace Name           | License             |
| ------------------------ | ------------------- |
| @vltpkg/cache            | BSD-2-Clause-Patent |
| @vltpkg/cache-unzip      | BSD-2-Clause-Patent |
| @vltpkg/cli-sdk          | BSD-2-Clause-Patent |
| @vltpkg/cmd-shim         | BSD-2-Clause-Patent |
| @vltpkg/dep-id           | BSD-2-Clause-Patent |
| @vltpkg/dot-prop         | MIT                 |
| @vltpkg/dss-breadcrumb   | BSD-2-Clause-Patent |
| @vltpkg/dss-parser       | BSD-2-Clause-Patent |
| @vltpkg/error-cause      | BSD-2-Clause-Patent |
| @vltpkg/fast-split       | BSD-2-Clause-Patent |
| @vltpkg/git              | ISC                 |
| @vltpkg/git-scp-url      | BSD-2-Clause-Patent |
| @vltpkg/graph            | BSD-2-Clause-Patent |
| @vltpkg/gui              | FSL-1.1-MIT         |
| @vltpkg/init             | BSD-2-Clause-Patent |
| @vltpkg/keychain         | BSD-2-Clause-Patent |
| @vltpkg/output           | BSD-2-Clause-Patent |
| @vltpkg/package-info     | BSD-2-Clause-Patent |
| @vltpkg/package-json     | BSD-2-Clause-Patent |
| @vltpkg/pick-manifest    | BSD-2-Clause-Patent |
| @vltpkg/promise-spawn    | ISC                 |
| @vltpkg/query            | BSD-2-Clause-Patent |
| @vltpkg/registry-client  | BSD-2-Clause-Patent |
| @vltpkg/rollback-remove  | BSD-2-Clause-Patent |
| @vltpkg/run              | BSD-2-Clause-Patent |
| @vltpkg/satisfies        | BSD-2-Clause-Patent |
| @vltpkg/security-archive | BSD-2-Clause-Patent |
| @vltpkg/semver           | BSD-2-Clause-Patent |
| @vltpkg/server           | BSD-2-Clause-Patent |
| @vltpkg/spec             | BSD-2-Clause-Patent |
| @vltpkg/tar              | BSD-2-Clause-Patent |
| @vltpkg/types            | BSD-2-Clause-Patent |
| @vltpkg/url-open         | BSD-2-Clause-Patent |
| @vltpkg/vlt-json         | BSD-2-Clause-Patent |
| @vltpkg/vlx              | BSD-2-Clause-Patent |
| @vltpkg/which            | ISC                 |
| @vltpkg/workspaces       | BSD-2-Clause-Patent |
| @vltpkg/xdg              | BSD-2-Clause-Patent |

#### Infrastructure (`infra/*`)

| Workspace Name           | License             |
| ------------------------ | ------------------- |
| @vltpkg/benchmark        | BSD-2-Clause-Patent |
| @vltpkg/infra-build      | BSD-2-Clause-Patent |
| vlt                      | BSD-2-Clause-Patent |
| @vltpkg/cli-compiled     | BSD-2-Clause-Patent |
| @vltpkg/cli-darwin-arm64 | BSD-2-Clause-Patent |
| @vltpkg/cli-darwin-x64   | BSD-2-Clause-Patent |
| @vltpkg/cli-js           | BSD-2-Clause-Patent |
| @vltpkg/cli-linux-arm64  | BSD-2-Clause-Patent |
| @vltpkg/cli-linux-x64    | BSD-2-Clause-Patent |
| @vltpkg/cli-win32-x64    | BSD-2-Clause-Patent |
| @vltpkg/smoke-test       | BSD-2-Clause-Patent |

#### Documentation (`www/*`)

| Workspace Name | License             |
| -------------- | ------------------- |
| @vltpkg/docs   | BSD-2-Clause-Patent |
