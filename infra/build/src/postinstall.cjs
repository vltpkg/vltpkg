/* eslint-disable @typescript-eslint/no-require-imports */

const os = require('os')
const { join, dirname, basename } = require('path')
const fs = require('fs')

const execMode = 0o777 & ~process.umask()
const platform = os.platform()
const arch = os.arch()
const isWindows = platform === 'win32'
const rootPackage = __dirname
const pkg = JSON.parse(
  fs.readFileSync(join(rootPackage, 'package.json'), 'utf8'),
)

const unlinkSyncSafe = file => {
  try {
    fs.unlinkSync(file)
  } catch {}
}

const platformPkg = (() => {
  try {
    return dirname(
      require.resolve(`@vltpkg/cli-${platform}-${arch}/package.json`),
    )
  } catch (e) {
    throw new Error(
      `Could not find platform package for ${platform}-${arch}`,
      {
        cause: e,
      },
    )
  }
})()

const atomicCopySync = (source, target) => {
  const tmp = join(dirname(target), `${basename(target)}.tmp`)
  try {
    fs.copyFileSync(source, tmp)
    fs.renameSync(tmp, target)
    fs.chmodSync(target, execMode)
  } catch (err) {
    unlinkSyncSafe(tmp)
    throw new Error(`Could not copy platform bin`, {
      cause: {
        source,
        target,
        tmp,
        err,
      },
    })
  }
}

for (const binPath of Object.values(pkg.bin)) {
  const platformBinPath = `${binPath}${isWindows ? '.exe' : ''}`
  atomicCopySync(
    join(platformPkg, platformBinPath),
    join(rootPackage, platformBinPath),
  )
  if (platformBinPath !== binPath) {
    unlinkSyncSafe(join(rootPackage, binPath))
  }
}
