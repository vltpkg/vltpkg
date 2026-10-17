import t from 'tap'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

for (const fail of [undefined, 'bundle', 'compiler']) {
  t.test(fail ?? 'compile', async t => {
    t.intercept(process, 'argv', {
      value: [
        'node',
        'compile.ts',
        ...(fail ? [] : ['output', '--target=bun-linux-x64']),
      ],
    })
    let payload = ''
    const result = t.mockImport<typeof import('../src/compile.ts')>(
      '../src/compile.ts',
      {
        '../src/bundle.ts': {
          bundle: async (options: { outdir: string }) => {
            payload = options.outdir
            if (fail === 'bundle') throw new Error('bundle failed')
            return { scripts: ['unzip.js'] }
          },
        },
        'node:child_process': {
          execFileSync: (command: string, args: string[]) => {
            t.equal(command, 'bun')
            t.ok(args.includes(payload), 'embeds the bundle')
            t.ok(
              args.includes(
                resolve(fail ? '.build-bun/vlt' : 'output'),
              ),
            )
            t.equal(args.includes('--target=bun-linux-x64'), !fail)
            t.match(readFileSync(args[2]!, 'utf8'), '"unzip.js"')
            if (fail === 'compiler')
              throw new Error('compiler failed')
          },
        },
      },
    )
    if (fail) await t.rejects(result, new Error(`${fail} failed`))
    else await result
    t.notOk(existsSync(dirname(payload)), 'removes temporary files')
  })
}
