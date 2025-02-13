import { join, resolve } from 'node:path'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import { parseArgs as nodeParseArgs } from 'node:util'
import fs from 'node:fs'
import generateMatrix, {
  getMatrix,
  matrixConfig,
  type CompilationDir,
} from '../matrix.ts'
import { Paths } from '../index.ts'
import * as types from '../types.ts'

type Base = {
  name: string
  version: string
  description: string
  license: string
  keywords: string[]
  repository: Record<string, string>
  type: string
}

type Bundle = Base & {
  engines: { node: string }
}

type Compiled = Base & {
  engines: undefined
}

type CompiledRoot = Compiled & {
  scripts: { postinstall: string }
  optionalDependencies: Record<string, string>
}

type CompiledPlatform = Compiled & {
  bin: undefined
  os: types.Platform[]
  cpu: types.Arch[]
}

type Package = Bundle | Compiled | CompiledRoot | CompiledPlatform

type Publish<T extends Package = Package> = {
  dryRun: boolean
  tag: string
  files: {
    LICENSE: string
    'README.md': string
    'package.json': T
    '.npmrc': string
  } & (T extends CompiledRoot ?
    {
      [bin in types.Bin]?: string
    } & {
      'postinstall.js': string
    }
  : unknown)
}

const uniq = <T>(arr: T[]) => [...new Set<T>(arr)]

const assertOne = <T>(values: T[], msg: string): T => {
  assert(values.length === 1, msg)
  const [value] = values
  assert(value, msg)
  return value
}

const readFile = (path: string) => fs.readFileSync(path, 'utf8')

const readPackageJson = (path: string): unknown =>
  JSON.parse(readFile(path))

const TOKEN = process.env.VLT_CLI_PUBLISH_TOKEN
const PRERELEASE_ID = `.${Date.now()}`
const FILES = {
  README: readFile(join(Paths.CLI, 'README.md')),
  LICENSE: readFile(join(Paths.CLI, 'LICENSE')),
  PACKAGE_JSON: (() => {
    const pkg = readPackageJson(
      join(Paths.CLI, 'package.json'),
    ) as Bundle
    // Only keep the node engines for publishing
    pkg.engines = { node: pkg.engines.node }
    return pkg
  })(),
  POST_INSTALL: readFile(
    join(Paths.BUILD_ROOT, 'src/postinstall.js'),
  ),
  PLACEHOLDER_BIN: readFile(
    join(Paths.BUILD_ROOT, 'src/placeholder-bin.js'),
  ),
}

const parseArgs = () => {
  const { outdir, forReal, ...matrix } = nodeParseArgs({
    options: {
      outdir: { type: 'string' },
      forReal: { type: 'boolean' },
      ...matrixConfig,
    },
  }).values

  return {
    /* c8 ignore next */
    outdir: resolve(outdir ?? '.publish'),
    dryRun: !forReal,
    matrix: getMatrix(matrix),
  }
}

const publish = <T extends Package>(
  pkg: { dir: string },
  options: Publish<T>,
) => {
  fs.mkdirSync(pkg.dir, { recursive: true })

  const writeFiles = (files: Record<string, string | object>) => {
    for (const [name, contents] of Object.entries(files)) {
      fs.writeFileSync(
        join(pkg.dir, name),
        typeof contents === 'string' ? contents : (
          JSON.stringify(contents, null, 2) + '\n'
        ),
      )
    }
  }

  writeFiles(options.files)

  const binFiles = fs
    .readdirSync(pkg.dir)
    .reduce<Partial<Record<types.Bin, string>>>((acc, f) => {
      const bin = types.BinNames.find(b =>
        [b, `${b}.js`, `${b}.exe`].includes(f),
      )
      if (bin) {
        acc[bin] = f
      }
      return acc
    }, {})

  const noPackageJsonBins =
    'bin' in options.files['package.json'] &&
    options.files['package.json'].bin === undefined

  writeFiles({
    'package.json': {
      ...options.files['package.json'],
      bin: noPackageJsonBins ? undefined : binFiles,
      type: 'module',
    },
  })

  spawnSync(
    'npm',
    [
      'publish',
      '--access=public',
      `--tag=${options.tag}`,
      options.dryRun ? '--dry-run' : null,
    ].filter(v => v !== null),
    {
      cwd: pkg.dir,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NPM_PUBLISH_TOKEN: TOKEN,
      },
    },
  )

  return {
    pkg: readPackageJson(join(pkg.dir, 'package.json')) as T,
    binFiles: Object.keys(binFiles),
  }
}

const publishCompiled = (
  { dir }: { dir: string },
  compilations: CompilationDir[],
  baseOptions: Publish,
) => {
  assertOne(
    uniq(compilations.map(c => c.runtime)),
    'expected all compilations to have the same runtime',
  )

  const options: Publish<Compiled> = {
    ...baseOptions,
    files: {
      ...baseOptions.files,
      'package.json': {
        ...baseOptions.files['package.json'],
        // No engines needed for compiled packages
        engines: undefined,
      },
    },
  }

  const platformPackages = compilations.map(pkg =>
    publish<CompiledPlatform>(pkg, {
      ...options,
      files: {
        ...options.files,
        'package.json': {
          ...options.files['package.json'],
          // The format of this package name must stay in sync with the
          // require.resolve in the postinstall script.
          name: `@vltpkg/cli-${pkg.platform}-${pkg.arch}`,
          description: `${FILES.PACKAGE_JSON.description} (${pkg.platform}-${pkg.arch})`,
          // platform packaged dont get bins set in package json since those
          // would conflict with the root package. they get moved in place
          // by the postinstall script
          bin: undefined,
          os: [pkg.platform],
          cpu: [pkg.arch],
        },
      },
    }),
  )

  // All bin files from from platform packages are written to the root
  // as placeholders. These will error if postinstall or optional deps
  // are installed. TODO: a more robust solution will be to have the
  // bundled JS files called by the placeholder bins that way it works
  // even with --ignore-scripts or --no-optional. The tradeoff is that
  // then the CLI can run in two different modes which can make performance
  // and runtime errors harder to track down.
  const placeholderBinFiles = Object.fromEntries(
    uniq(platformPackages.flatMap(({ binFiles }) => binFiles)).map(
      bin => [bin, FILES.PLACEHOLDER_BIN],
    ),
  )

  // Each platform package is an optional dependency of the root package
  // so that the postinstall script can move the bins into place.
  // TODO: once we are out of prerelease mode, the pkg.version should
  // use a semver range
  const optionalDependencies = Object.fromEntries(
    platformPackages.map(({ pkg }) => [pkg.name, pkg.version]),
  )

  publish<CompiledRoot>(
    {
      dir,
    },
    {
      ...options,
      tag: 'compiled',
      files: {
        ...options.files,
        ...placeholderBinFiles,
        'postinstall.js': FILES.POST_INSTALL,
        'package.json': {
          ...options.files['package.json'],
          // The root package is commonjs because the postinstall script
          // is easiest written with require.resolve
          type: 'commonjs',
          optionalDependencies,
          scripts: { postinstall: 'node postinstall.js' },
        },
      },
    },
  )
}

const main = async () => {
  const { outdir, matrix, dryRun } = parseArgs()

  assert(
    dryRun || TOKEN,
    'expected VLT_CLI_PUBLISH_TOKEN to be set in non-dry-run mode',
  )

  fs.rmSync(outdir, { recursive: true, force: true })

  const options: Publish<Bundle> = {
    dryRun,
    tag: 'latest',
    files: {
      'README.md': FILES.README.replaceAll('# @vltpkg/vlt', '# vlt'),
      LICENSE: FILES.LICENSE,
      '.npmrc': `//registry.npmjs.org/:_authToken=\${NPM_PUBLISH_TOKEN}`,
      'package.json': {
        name: 'vlt',
        version: `${FILES.PACKAGE_JSON.version}${PRERELEASE_ID}`,
        description: FILES.PACKAGE_JSON.description,
        license: FILES.PACKAGE_JSON.license,
        keywords: FILES.PACKAGE_JSON.keywords,
        repository: FILES.PACKAGE_JSON.repository,
        engines: FILES.PACKAGE_JSON.engines,
        type: FILES.PACKAGE_JSON.type,
      },
    },
  }

  const { bundles, compilations } = await generateMatrix({
    outdir,
    verbose: true,
    matrix,
    // Only publish the main `vlt` bin if it's a compilation because its probably too
    // big to publish 5 * 80MB bins.
    bin: matrix.compilations.length ? [types.Bins.vlt] : undefined,
  })

  if (compilations.length) {
    publishCompiled(
      { dir: join(outdir, 'compile-root-package') },
      compilations,
      options,
    )
  } else {
    publish(
      assertOne(bundles, 'expected exactly one bundle to publish'),
      options,
    )
  }
}

await main()
