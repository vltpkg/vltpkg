import t from 'tap'
import { PathScurry } from 'path-scurry'
import { PackageJson } from '@vltpkg/package-json'
import { getProjectData } from '../src/get-project-data.ts'

t.test(
  'getProjectData infers tools and vlt install via directory',
  t => {
    const dir = t.testdir({
      project: {
        'package.json': JSON.stringify({
          engines: { bun: '*' },
        }),
        'vlt.json': JSON.stringify({}),
        node_modules: {
          '.vlt': {
            cache: {},
          },
        },
      },
    })

    const scurry = new PathScurry(dir)
    const folder = scurry.cwd.resolve('project')

    const result = getProjectData(
      {
        packageJson: new PackageJson(),
        scurry,
      },
      folder,
    )

    t.equal(result.root, folder.fullpathPosix())
    t.type(result.homedirRelativeRoot, 'string')
    t.equal(result.vltInstalled, true)
    t.ok(result.tools.includes('bun'))
    t.ok(result.tools.includes('vlt'))
    t.end()
  },
)

t.test('getProjectData detects vlt install via lockfile', t => {
  const dir = t.testdir({
    project: {
      'package.json': JSON.stringify({}),
      node_modules: {
        '.vlt-lock.json': JSON.stringify({}),
      },
    },
  })

  const scurry = new PathScurry(dir)
  const folder = scurry.cwd.resolve('project')

  const result = getProjectData(
    {
      packageJson: new PackageJson(),
      scurry,
    },
    folder,
  )

  t.equal(result.vltInstalled, true)
  t.ok(result.tools.includes('vlt'))
  t.end()
})

t.test(
  'getProjectData defaults to js when no known tool is found',
  t => {
    const dir = t.testdir({
      project: {
        'package.json': JSON.stringify({
          name: 'plain-js',
        }),
        node_modules: {},
      },
    })

    const scurry = new PathScurry(dir)
    const folder = scurry.cwd.resolve('project')

    const result = getProjectData(
      {
        packageJson: new PackageJson(),
        scurry,
      },
      folder,
    )

    t.equal(result.vltInstalled, false)
    t.same(result.tools, ['js'])
    t.end()
  },
)
