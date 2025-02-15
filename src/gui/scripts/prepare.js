import { spawn } from 'child_process'
import * as esbuild from 'esbuild'
import { rm, mkdir, cp } from 'fs/promises'
import { join } from 'path'
import { parseArgs } from 'util'
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
  await mkdir(join(cwd, outdir), { force: true })
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
    conditions: ['@vltpkg/source'],
    define: {
      'process.env.NODE_ENV': `"${argv.production ? 'production' : 'development'}"`,
    },
  }
  if (argv.watch) {
    const ctx = await esbuild.context(options)
    await ctx.watch()
    await ctx.serve({ servedir: outdir, port: PORT })
  } else {
    await esbuild.build(options)
  }
}

const css = async () => {
  const tailwind = await which('tailwind', {
    path: join(cwd, 'node_modules/.bin'),
  })
  await new Promise((res, rej) => {
    const proc = spawn(
      tailwind,
      [
        '-i',
        join(srcdir, 'main.css'),
        '-o',
        join(outdir, 'main.css'),
        ...(argv.watch ? ['--watch'] : []),
        ...(argv.production ? ['--minify'] : []),
      ],
      { cwd, shell: true },
    )
    const log = data => {
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

main()
