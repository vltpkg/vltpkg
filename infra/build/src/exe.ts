#!/usr/bin/env -S node --experimental-strip-types --no-warnings

/**
 * Builds standalone executables for the vlt CLI using esbuild + tsdown SEA.
 *
 * Flow:
 * 1. esbuild bundles CLI into a single JS file (no code splitting)
 * 2. tsdown wraps the bundle into Node.js Single Executable Applications
 *
 * Requirements:
 * - Node.js >= 25.7.0 (for ESM support in SEA)
 * - tsdown and @tsdown/exe installed
 */

import {
  mkdirSync,
  rmSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { resolve, join, basename, extname } from 'node:path'
import { parseArgs } from 'node:util'
import * as esbuild from 'esbuild'
import { builtinModules } from 'node:module'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert'
import { EOL } from 'node:os'
import {
  EXE_TARGETS,
  NODE_VERSION,
  exeFileName,
} from './exe-targets.ts'
import type { ExeTarget } from './exe-targets.ts'
import { CLI } from './bundle.ts'

const SEA_ENTRY = resolve(import.meta.dirname, 'sea-entry.ts')

const nodeImports: esbuild.Plugin = {
  name: 'node-imports',
  setup({ onResolve }) {
    onResolve({ filter: /()/, namespace: 'file' }, args => {
      if (
        builtinModules.includes(args.path) &&
        !args.path.startsWith('node:')
      ) {
        return { path: `node:${args.path}`, external: true }
      }
    })
  },
}

const resvgWasmExternal: esbuild.Plugin = {
  name: 'resvg-wasm-external',
  setup({ onResolve }) {
    onResolve({ filter: /^@resvg\/resvg-wasm/ }, args => ({
      path: args.path,
      external: true,
    }))
  },
}

/**
 * Replaces the dynamic `import(\`./commands/\${command}.ts\`)` in
 * load-command.ts with a static lookup map so that esbuild can
 * produce a single file with no code splitting.
 */
const staticCommandLoader = (): esbuild.Plugin => {
  const commandsDir = resolve(CLI, 'src', 'commands')
  const commandFiles = readdirSync(commandsDir)
    .filter(f => f.endsWith('.ts') && !f.startsWith('_'))
    .map(f => basename(f, extname(f)))

  const staticImports = commandFiles
    .map(
      (name, i) =>
        `import * as _cmd${String(i)} from './commands/${name}.ts'`,
    )
    .join(EOL)

  const mapEntries = commandFiles
    .map((name, i) => `'${name}': _cmd${String(i)}`)
    .join(`,${EOL}  `)

  const replacement = `
import { error } from '@vltpkg/error-cause'
${staticImports}

const _commands = {
  ${mapEntries}
}

export type CommandUsage = () => import('jackspeak').Jack
export type CommandFn<T = unknown> = (conf: any) => Promise<T>
export type Command<T> = {
  command: CommandFn<T>
  usage: CommandUsage
  views: any
}

export const loadCommand = async <T>(
  command: string | undefined,
): Promise<Command<T>> => {
  const mod = _commands[command as keyof typeof _commands]
  if (!mod) {
    throw error('Could not load command', { found: command })
  }
  return mod as unknown as Command<T>
}
`

  return {
    name: 'static-command-loader',
    setup({ onLoad }) {
      onLoad(
        { filter: /load-command\.ts$/, namespace: 'file' },
        () => ({ contents: replacement, loader: 'ts' }),
      )
    },
  }
}

/**
 * Replaces __CODE_SPLIT_SCRIPT_NAME with a sentinel value so
 * spawned background workers can detect SEA mode and skip.
 */
const seaCodeSplitPlugin: esbuild.Plugin = {
  name: 'sea-code-split',
  setup({ onLoad }) {
    onLoad(
      {
        filter:
          /src[\\/](rollback-remove|cache-unzip|registry-client)[\\/]src[\\/]/,
        namespace: 'file',
      },
      async args => {
        const { readFile } = await import('node:fs/promises')
        const source = await readFile(args.path, 'utf8')
        if (
          !source.includes('export const __CODE_SPLIT_SCRIPT_NAME')
        ) {
          return undefined
        }
        const replaced = source
          .replace(
            /export const __CODE_SPLIT_SCRIPT_NAME\s*=\s*import\.meta\.filename/,
            `export const __CODE_SPLIT_SCRIPT_NAME = '__SEA_EMBEDDED__'`,
          )
          .replace(
            /const isMain\s*=\s*\(path\?\:\s*string\)\s*=>[^}]+/,
            `const isMain = (_path?: string) => false`,
          )
        return { contents: replaced, loader: 'ts' }
      },
    )
  },
}

async function bundleSingleFile(outdir: string): Promise<string> {
  const outfile = join(outdir, 'vlt-sea-bundle.js')

  const u = (importName: string) => `_vlt_${importName}`
  const i = (importName: string) =>
    `${importName} as ${u(importName)}`

  const { errors, warnings } = await esbuild.build({
    entryPoints: [SEA_ENTRY],
    plugins: [
      nodeImports,
      resvgWasmExternal,
      staticCommandLoader(),
      seaCodeSplitPlugin,
    ],
    outfile,
    sourcemap: false,
    minify: true,
    splitting: false,
    format: 'esm',
    bundle: true,
    platform: 'node',
    target: 'es2022',
    banner: {
      js: [
        'var global = globalThis',
        `import {Buffer} from "node:buffer"`,
        `import {${i('setTimeout')},${i('clearTimeout')},${i('setImmediate')},${i('clearImmediate')},${i('setInterval')},${i('clearInterval')}} from "node:timers"`,
        `globalThis.setTimeout = ${u('setTimeout')}`,
        `globalThis.clearTimeout = ${u('clearTimeout')}`,
        `globalThis.setImmediate = ${u('setImmediate')}`,
        `globalThis.clearImmediate = ${u('clearImmediate')}`,
        `globalThis.setInterval = ${u('setInterval')}`,
        `globalThis.clearInterval = ${u('clearInterval')}`,
        `import {${i('createRequire')}} from "node:module"`,
        `var require = ${u('createRequire')}(import.meta.filename)`,
      ]
        .map(l => `${l};`)
        .join(EOL),
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.TAP': 'false',
      'process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON':
        '"cli-package.json"',
      'process.env.__VLT_INTERNAL_REGISTRY_CLIENT_PACKAGE_JSON':
        '"registry-client-package.json"',
      'process.env.__VLT_INTERNAL_LIVE_RELOAD': 'false',
    },
  })

  assert(
    !errors.length && !warnings.length,
    new Error('esbuild error', { cause: { errors, warnings } }),
  )

  return outfile
}

async function buildExe(
  bundlePath: string,
  outdir: string,
  targets: ExeTarget[],
) {
  const tsdownTargets = targets.map(t => ({
    platform: t.platform,
    arch: t.arch,
    nodeVersion: NODE_VERSION,
  }))

  const configPath = join(outdir, 'tsdown.config.json')
  writeFileSync(
    configPath,
    JSON.stringify(
      {
        entry: [bundlePath],
        outDir: outdir,
        exe: {
          fileName: 'vlt',
          targets: tsdownTargets,
          seaConfig: {
            disableExperimentalSEAWarning: true,
            useCodeCache: false,
            useSnapshot: false,
          },
        },
      },
      null,
      2,
    ),
  )

  const tsdownBin = resolve(
    import.meta.dirname,
    '../../../node_modules/.bin/tsdown',
  )
  execFileSync(tsdownBin, ['--config', configPath], {
    stdio: 'inherit',
    cwd: outdir,
  })
}

const main = async () => {
  const {
    values: { outdir },
  } = parseArgs({
    options: {
      outdir: { type: 'string', default: '.build-exe' },
    },
  })

  assert(outdir, 'outdir is required')
  const resolvedOutdir = resolve(outdir)

  const [major] = process.versions.node.split('.').map(Number)
  if ((major ?? 0) < 25) {
    console.error(
      `Error: Node.js >= 25.7.0 is required for exe builds (current: ${process.version})`,
    )
    process.exit(1)
  }

  rmSync(resolvedOutdir, { recursive: true, force: true })
  mkdirSync(resolvedOutdir, { recursive: true })

  const bundleDir = join(resolvedOutdir, '_bundle')
  mkdirSync(bundleDir, { recursive: true })

  console.log('Bundling CLI into single file...')
  const bundlePath = await bundleSingleFile(bundleDir)

  console.log(
    `Building executables for ${String(EXE_TARGETS.length)} targets...`,
  )
  const exeOutdir = join(resolvedOutdir, '_exe')
  await buildExe(bundlePath, exeOutdir, EXE_TARGETS)

  // Move built executables to the final output directory with standard names
  for (const target of EXE_TARGETS) {
    const expectedName = exeFileName(target)
    const tsdownName = `vlt-${target.platform}-${target.arch}${target.platform === 'win' ? '.exe' : ''}`
    const src = join(exeOutdir, tsdownName)
    const dest = join(resolvedOutdir, expectedName)
    try {
      renameSync(src, dest)
      console.log(`  ${expectedName}`)
    } catch {
      console.warn(
        `  Warning: ${expectedName} not found (${tsdownName})`,
      )
    }
  }

  // Cleanup temp directories
  rmSync(bundleDir, { recursive: true, force: true })
  rmSync(exeOutdir, { recursive: true, force: true })

  console.log(`\nExecutables written to ${resolvedOutdir}`)
}

await main()
