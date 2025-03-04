#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { parseArgs } from 'node:util'
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import assert from 'node:assert'
import { resolve } from 'node:path'
import { bundle } from './bundle.ts'
import { compile } from './compile.ts'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  [key: string]: unknown
  engines?: { node?: string }
  publishConfig?: {
    os?: string[]
    cpu?: string[]
    bin?: Record<string, string>
    optionalDependencies?: Record<string, string>
    directory: string
  }
}

const PUBLISH_CONFIG = pkg.publishConfig
const PLATFORM_PACKAGE = PUBLISH_CONFIG?.os ?? PUBLISH_CONFIG?.cpu
const ROOT_PACKAGE = PUBLISH_CONFIG?.optionalDependencies

const copyFiles = (outdir: string) => {
  // If this script is not run from a package with a publishConfig,
  // then we don't need to copy any of the files that will only be used
  // for publishing
  if (!PUBLISH_CONFIG) {
    return
  }

  cpSync('./README.md', resolve(outdir, 'README.md'))
  cpSync('./LICENSE', resolve(outdir, 'LICENSE'))

  // Only the cli-compiled workspace has these files
  if (ROOT_PACKAGE) {
    cpSync('./postinstall.cjs', resolve(outdir, 'postinstall.cjs'))
    cpSync(
      './placeholder-bin.js',
      resolve(outdir, 'placeholder-bin.js'),
    )
  }

  // compiled bins dont need a node engines
  const nodeEngines =
    PLATFORM_PACKAGE || ROOT_PACKAGE ? undefined : pkg.engines?.node

  writeFileSync(
    resolve(outdir, 'package.json'),
    JSON.stringify(
      {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        repository: pkg.repository,
        keywords: pkg.keywords,
        type: pkg.type,
        license: pkg.license,
        // engines might contain other keys but for publishing we only need to set the node one
        ...(nodeEngines ?
          { engines: { node: nodeEngines } }
        : undefined),
        ...PUBLISH_CONFIG,
        // Omit the publishConfig.directory from the package.json
        // because that is only used by this script and pnpm
        directory: undefined,
        // During a real publish, do not set bins of platform specific
        // packages because they are optional deps of the root package
        // and will be placed by the postinstall script. Setting them
        // here will conflict with the root package bins.
        ...((
          process.env.npm_command === 'publish' && PLATFORM_PACKAGE
        ) ?
          { bin: undefined }
        : undefined),
        // Because we are using publishConfig.directory and copying a package.json there
        // we have to manually set the optional dep versions ourselves.
        ...(ROOT_PACKAGE ?
          {
            optionalDependencies: Object.fromEntries(
              Object.keys(
                /* c8 ignore next */
                PUBLISH_CONFIG.optionalDependencies ?? {},
              ).map(k => [k, pkg.version]),
            ),
          }
        : undefined),
      },
      null,
      2,
    ),
    'utf8',
  )
}

const { action, opts } = (() => {
  const { action, ...opts } = parseArgs({
    options: {
      action: {
        type: 'string',
        default:
          PLATFORM_PACKAGE ? 'compile'
          : ROOT_PACKAGE ? 'copy'
          : 'bundle',
      },
      outdir: { type: 'string', default: PUBLISH_CONFIG?.directory },
      platform: { type: 'string', default: PUBLISH_CONFIG?.os?.[0] },
      arch: { type: 'string', default: PUBLISH_CONFIG?.cpu?.[0] },
      bins: {
        type: 'string',
        multiple: true,
        default:
          PUBLISH_CONFIG?.bin ?
            Object.keys(PUBLISH_CONFIG.bin)
          : undefined,
      },
    },
  }).values

  assert(opts.outdir, 'outdir is required')

  return {
    action,
    opts: {
      ...opts,
      outdir: resolve(opts.outdir),
    },
  }
})()

rmSync(opts.outdir, { recursive: true, force: true })
mkdirSync(opts.outdir, { recursive: true })

let res: { outdir: string; [key: string]: unknown } | null = null

switch (action) {
  // Bundle the JS version of the CLI
  case 'bundle': {
    res = await bundle(opts)
    break
  }

  // Compile the binary version of the CLI
  // optionally specifying the source directory
  // and default to a newly bundled version.
  case 'compile': {
    res = await compile(opts)
    break
  }

  // Nothing to do for bundling/compling, just copy files
  case 'copy': {
    res = { outdir: opts.outdir }
    break
  }

  /* c8 ignore next 2 */
  default:
    throw new Error(`Unknown action: ${action}`)
}

copyFiles(res.outdir)

// Only log if not running in a publish script
// since pnpm will output the relevant info
if (!PUBLISH_CONFIG) {
  console.error(res)
}
