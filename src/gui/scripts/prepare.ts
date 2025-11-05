import 'varlock/auto-load'
import { spawn } from 'node:child_process'
import * as esbuild from 'esbuild'
import { rm, mkdir, cp } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { which } from '@vltpkg/which'

const PORT = 7018

const { values: argv } = parseArgs({
  options: {
    watch: { type: 'boolean' },
    production: { type: 'boolean' },
  },
})

const srcdir = 'src'
const outdir = 'dist'
const cwd = process.cwd()

const html = async () => {
  await rm(join(cwd, outdir), {
    force: true,
    recursive: true,
  })
  await mkdir(join(cwd, outdir), { recursive: true })
  await cp(join(cwd, 'public'), join(cwd, outdir), {
    recursive: true,
  })
}

const js = async () => {
  const options = {
    entryPoints: [join(srcdir, 'index.tsx')],
    target: ['chrome129', 'edge129', 'firefox130', 'safari18'],
    sourcemap: true,
    outdir,
    bundle: true,
    format: 'cjs',
    jsx: 'automatic',
    minify: argv.production,
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': `"${argv.production ? 'production' : 'development'}"`,
      __VLT_FORCE_HOSTED: `"${process.env.__VLT_FORCE_HOSTED || ''}"`,
    },
  } satisfies esbuild.BuildOptions
  if (argv.watch) {
    const ctx = await esbuild.context(options)
    await ctx.watch()
    await ctx.serve({ servedir: outdir, port: PORT })
  } else {
    await esbuild.build(options)
  }
}

const css = async () => {
  const tailwind = await which('tailwindcss', {
    path: join(cwd, 'node_modules/.bin'),
  })
  await new Promise<void>((res, rej) => {
    const proc = spawn(
      tailwind,
      [
        '-i',
        join(srcdir, 'styles/main.css'),
        '-o',
        join(outdir, 'styles/main.css'),
        ...(argv.watch ? ['--watch'] : []),
        ...(argv.production ? ['--minify'] : []),
      ],
      { cwd, shell: true },
    )
    const log = (data: Buffer) => {
      const str = data.toString().trim()
      if (str) {
        console.log('[tailwind]', str)
      }
    }
    proc.stdout.on('data', log)
    proc.stderr.on('data', log)
    proc
      .on('close', code =>
        code === 0 ? res() : rej(new Error(`tailwind failed`)),
      )
      .on('error', rej)
  })
}

const main = async () => {
  await html()
  await Promise.all([js(), css()])
}

await main()
