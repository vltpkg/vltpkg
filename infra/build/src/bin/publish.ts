import { join, resolve } from 'node:path'
import assert from 'node:assert'
import { spawnSync } from 'node:child_process'
import { parseArgs as nodeParseArgs } from 'node:util'
import fs from 'node:fs'
import generateMatrix, {
  getMatrix,
  matrixConfig,
  type CompilationDir,
} from '../matrix.js'
import { Paths } from '../index.js'
import * as types from '../types.js'

type PackageJsonBase = {
  name: string
  version: string
  description: string
  license: string
  keywords: string[]
  repository: Record<string, string>
}

type PackageJsonBundle = PackageJsonBase & {
  engines: Record<string, string>
}

type PackageJsonCompiled = PackageJsonBase & {
  engines: undefined
}

type PackageJsonCompiledRoot = PackageJsonCompiled & {
  scripts: { postinstall: string }
  optionalDependencies: Record<string, string>
}

type PackageJsonCompiledPlatform = PackageJsonCompiled & {
  bin: undefined
  os: types.Platform[]
  cpu: types.Arch[]
}

type PackageJson =
  | PackageJsonBundle
  | PackageJsonCompiled
  | PackageJsonCompiledRoot
  | PackageJsonCompiledPlatform

type PublishOptions<T extends PackageJson = PackageJson> = {
  dryRun: boolean
  tag: string
  files: {
    LICENSE: string
    'README.md': string
    'package.json': T
    '.npmrc': string
  } & (T extends PackageJsonCompiledRoot ?
    {
      [bin in types.Bin]?: string
    } & {
      'postinstall.js': string
    }
  : unknown)
}

const readFile = (path: string) => fs.readFileSync(path, 'utf8')

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const readPackageJson = <T>(path: string): T =>
  JSON.parse(readFile(path)) as T

const TOKEN = process.env.VLT_CLI_PUBLISH_TOKEN
const PRERELEASE_ID = `.${Date.now()}`
const FILES = {
  README: readFile(join(Paths.CLI, 'README.md')),
  LICENSE: readFile(join(Paths.CLI, 'LICENSE')),
  PACKAGE_JSON: readPackageJson<PackageJsonBundle>(
    join(Paths.CLI, 'package.json'),
  ),
  POST_INSTALL: readFile(
    join(Paths.BUILD_ROOT, 'src/postinstall.js'),
  ),
  PLACEHOLDER_BIN: readFile(
    join(Paths.BUILD_ROOT, 'src/placeholder-bin.js'),
  ),
}

const createWriteFiles = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true })
  return (files: Record<string, string | object>) => {
    for (const [name, contents] of Object.entries(files)) {
      fs.writeFileSync(
        join(dir, name),
        typeof contents === 'string' ? contents : (
          JSON.stringify(contents, null, 2) + '\n'
        ),
      )
    }
  }
}

const parseArgs = () => {
  const { outdir, forReal, ...matrix } = nodeParseArgs({
    options: {
      outdir: { type: 'string' },
      forReal: { type: 'boolean' },
      tag: { type: 'string' },
      ...matrixConfig,
    },
  }).values

  return {
    /* c8 ignore next */
    outdir: resolve(outdir ?? '.publish'),
    /* c8 ignore next */
    dryRun: !forReal,
    matrix: getMatrix(matrix),
  }
}

const publish = <T extends PackageJson>(
  pkg: { dir: string; format: types.Format },
  options: PublishOptions<T>,
) => {
  const writeFiles = createWriteFiles(pkg.dir)

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

  writeFiles({
    'package.json': {
      ...options.files['package.json'],
      bin:
        'bin' in options.files['package.json'] ?
          options.files['package.json'].bin
        : binFiles,
      type: pkg.format === types.Formats.Cjs ? 'commonjs' : 'module',
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
    pkg: readPackageJson<T>(join(pkg.dir, 'package.json')),
    binFiles: Object.keys(binFiles),
  }
}

const publishCompiled = (
  outdir: string,
  runtime: types.Runtime,
  compilations: CompilationDir[],
  baseOptions: PublishOptions,
) => {
  const options: PublishOptions<PackageJsonCompiled> = {
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
    publish<PackageJsonCompiledPlatform>(pkg, {
      ...options,
      files: {
        ...options.files,
        'package.json': {
          ...options.files['package.json'],
          name: `@vltpkg/cli-${pkg.platform}-${pkg.arch}`,
          description: `${FILES.PACKAGE_JSON.description} for ${pkg.platform} ${pkg.arch}`,
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

  publish<PackageJsonCompiledRoot>(
    { dir: join(outdir, 'root-compiled'), format: types.Formats.Cjs },
    {
      ...options,
      tag: runtime,
      files: {
        ...options.files,
        // all platform packages should have the same bins
        ...Object.fromEntries(
          (platformPackages[0]?.binFiles ?? []).map(
            b => [b, FILES.PLACEHOLDER_BIN] as const,
          ),
        ),
        'postinstall.js': FILES.POST_INSTALL,
        'package.json': {
          ...options.files['package.json'],
          scripts: { postinstall: 'node postinstall.js' },
          optionalDependencies: Object.fromEntries(
            platformPackages.map(({ pkg }) => [
              pkg.name,
              pkg.version,
            ]),
          ),
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

  const options: PublishOptions<PackageJsonBundle> = {
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
      },
    },
  }

  const { bundles, compilations } = await generateMatrix({
    outdir,
    verbose: true,
    matrix,
    // Only publish the main `vlt` bin if it's a compilation because its probably too
    // big to publish 5 * 80MB bins.
    bin: matrix.compilations.length ? types.Bins.vlt : undefined,
  })

  if (compilations.length) {
    const runtimes = new Set(matrix.compilations.map(c => c.runtime))
    const runtime = [...runtimes][0]
    assert(
      runtime && runtimes.size === 1,
      'expected all compilations to have the same runtime',
    )
    publishCompiled(outdir, runtime, compilations, options)
  } else {
    const [pkg] = bundles
    assert(
      pkg && bundles.length === 1,
      'expected exactly one bundle to publish',
    )
    publish(pkg, options)
  }
}

await main()
