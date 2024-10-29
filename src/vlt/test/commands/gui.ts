import t from 'tap'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { LoadedConfig } from '../../src/config/index.js'

class PackageJson {
  read() {
    return { name: 'my-project', version: '1.0.0' }
  }
}
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PathScurry {}
const options = {
  projectRoot: t.testdirName,
  scurry: new PathScurry(),
  packageJson: new PackageJson(),
}

t.test('starts gui data and server', async t => {
  let openURL = ''
  let openPort = 0
  let openHost = ''
  const dir = t.testdirName
  const { usage, command } = await t.mockImport(
    '../../src/commands/gui.js',
    {
      'node:os': {
        tmpdir() {
          return dir
        },
      },
      'node:http': {
        createServer() {
          return {
            listen(port: number, host: string, cb: () => void) {
              openPort = port
              openHost = host
              setImmediate(cb)
            },
          }
        },
      },
      opener: (url: string) => {
        openURL = url
      },
      '@vltpkg/graph': {
        actual: {
          load() {
            return {
              options: {},
              nodes: {},
              edges: {},
              importers: [],
            }
          },
        },
      },
      '@vltpkg/package-json': {
        PackageJson,
      },
      'path-scurry': {
        PathScurry,
        PathScurryDarwin: PathScurry,
        PathScurryLinux: PathScurry,
        PathScurryPosix: PathScurry,
        PathScurryWin32: PathScurry,
      },
    },
  )

  t.type(usage, 'string')

  // workaround for the import.meta.resolve issue not working with tap atm
  const guiFolder = resolve(
    import.meta.dirname,
    '../../../../src/gui/dist',
  )

  const log = t.capture(console, 'log').args

  await command(
    { options } as unknown as LoadedConfig,
    undefined,
    guiFolder,
  )

  const tmp = resolve(dir, 'vltgui')
  const files: string[] = []
  for (const file of readdirSync(tmp)) {
    files.push(file)
  }
  t.matchSnapshot(files, 'should copy all files to tmp directory')

  t.matchSnapshot(
    JSON.parse(readFileSync(resolve(tmp, 'graph.json'), 'utf8')),
    'should write empty graph.json used in tests',
  )

  t.matchSnapshot(log()[0], 'should log the server start message')

  t.strictSame(openPort, 7017, 'should open the correct port')
  t.strictSame(openHost, 'localhost', 'should open the correct host')
  t.strictSame(
    openURL,
    'http://localhost:7017/explore',
    'should open the correct browser URL',
  )
})
