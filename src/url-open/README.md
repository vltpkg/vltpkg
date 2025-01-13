# @vltpkg/url-open

Open URLs using the system default web browser, for logging into
registries and minting OTP tokens and such.

**[Usage](#usage)**

## Overview

Give it a URL, and it'll try to open it in the user's default web
browser.

## Usage

```js
import { urlOpen } from '@vltpkg/url-open'

await urlOpen('https://example.com/')

// url has now been open, or an error was thrown
```
