# @vltpkg/user-agent

The `User-Agent` string that vlt sends with every outbound request.

**[Usage](#usage)**

## Overview

Every place in the client that talks to a registry or an API sends the
same `User-Agent`, and lifecycle scripts see the same value in
`npm_config_user_agent`. This package is the single source of that
string so the various clients cannot drift apart.

The value is the vlt version followed by the runtime, which is taken
from `navigator.userAgent` when one is available, and otherwise
detected from `process.versions`.

This package has no dependencies and touches no node builtins, so it
is safe to use from browser-safe packages such as `@vltpkg/query`.

## Usage

```js
import { userAgent } from '@vltpkg/user-agent'

console.log(userAgent) // vlt/1.0.10 Node.js/22.22.0
```
