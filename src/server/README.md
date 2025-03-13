# @vltpkg/server

The server backend that powers the vlt gui.

**[Usage](#usage)**

## Overview

This is a library that starts the HTTP server for vlt gui views.

## Usage

```js
import { createServer } from '@vltpkg/server'

// load configs
const conf = getLoadedConfigSomehow()

// create the server
const server = createServer(conf.options)

// update options when required
server.on('needConfigUpdate', dir => {
  conf.resetOptions(dir)
  server.updateOptions(conf.options)
})

// start listening on a port
await server.start()

console.log(`Listening on ${server.address()}`)

// if you have a path, you can also open it now in a browser
await urlOpen(server.address('/some/path'))
```
