/* eslint-disable @typescript-eslint/no-require-imports */

const os = require('os')
const { join, dirname, basename } = require('path')
const fs = require('fs')

const platform = os.platform()
const arch = os.arch()
const rootPackage = __dirname
const bins = Object.values(
  require(join(rootPackage, 'package.json')).bin,
)

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
  } catch (err) {
    try {
      fs.unlinkSync(tmp)
    } catch (err2) {
      throw new Error(`Could not unlink tmp platform bin`, {
        cause: err2,
      })
    }
    throw new Error(`Could not copy platform bin`, { cause: err })
  }
}

for (const binPath of bins) {
  atomicCopySync(
    join(platformPkg, binPath + `${os === 'win32' ? '.exe' : ''}`),
    join(rootPackage, binPath),
  )
}
