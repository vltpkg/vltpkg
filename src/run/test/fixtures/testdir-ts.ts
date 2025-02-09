import { extname, resolve, relative, win32, posix } from 'path'
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'fs'
import { Test } from 'tap'
import { inspect } from 'util'

/**
 * A function that will create fixtures out of all the `*.ts` files in a directory.
 * Assumes that `process.cwd()` contains a tsconfig.json and has tsc installed.
 * {@param} t - the tap instance to use
 * {@param} dir - the directory of ts files
 * {@returns} out - the directory where the files were created
 */
export const tsTestdir = (t: Test, dir: string) => {
  const cwd = process.cwd()
  const out = t.testdirName
  const relOut = relative(out, cwd).replaceAll(win32.sep, posix.sep)
  const relDir = relative(dir, cwd).replaceAll(win32.sep, posix.sep)
  const exts = ['.ts']

  t.testdir({
    ...readdirSync(dir, { withFileTypes: true })
      .filter(p => p.isFile() && exts.includes(extname(p.name)))
      .reduce<Record<string, string>>(
        (acc, p) => (
          (acc[p.name] = readFileSync(resolve(p.parentPath, p.name))
            .toString()
            .replaceAll(
              posix.join(relDir, 'src'),
              posix.join(relOut, 'dist/esm'),
            )
            .replaceAll(relDir, relOut)),
          acc
        ),
        {},
      ),
    'tsconfig.json': JSON.stringify({
      extends: `${relOut}/tsconfig.json`,
      include: exts.map(e => `./*${e}`),
      compilerOptions: {
        inlineSources: false,
        inlineSourceMap: false,
        declaration: false,
        sourceMap: false,
        declarationMap: false,
        incremental: false,
      },
    }),
  })

  const tsc = spawnSync('tsc', [], {
    cwd: t.testdirName,
    encoding: 'utf8',
    shell: true,
  })
  const bail =
    tsc.status ? tsc.output.filter(Boolean).join('\n')
    : tsc.error ? inspect(tsc.error)
    : undefined
  if (bail) t.bailout(bail)

  return out
}
