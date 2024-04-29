#!/usr/bin/env node

const s = Date.now()

import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { buildStarterGraph, Package } from '@vltpkg/graph'
import { CacheEntry, RegistryClient } from '@vltpkg/registry-client'
import { unpack } from '@vltpkg/tar'

async function install () {
  const graph = await buildStarterGraph({ dir: process.cwd() })
  const packages = graph.packages.pending
  const registryClient = new RegistryClient({})

  const reqs = []
  for (const pkg of packages) {
    reqs.push(
      registryClient
        .request(pkg.tarball)
        .then(response => unpack(response.body, 'node_modules/' + pkg.name))
        .then(() => pkg.name)
    )
  }
  const res = await Promise.all(reqs)
  for (const name of res) {
    console.log(`extracted: ${name}`)
  }

  const t = Date.now() - s
  console.log(`⚡️ Done in ${t}ms`)
}

async function main () {
  const { positionals } = parseArgs({ strict: false });
  const [cmd] = positionals
  if (cmd) {
    switch (cmd) {
      case "install":
        return install()
    }
  } else {
    console.log(`
 ⚡️ Welcome to vlt /völt/

  commands:

    install       installs the dependencies for the current project
`)
  }
}

main()
