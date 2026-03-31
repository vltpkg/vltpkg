export const NODE_VERSION = '25.7.0'

export type ExeTarget = {
  platform: 'linux' | 'darwin' | 'win'
  arch: 'x64' | 'arm64'
  /** `process.platform` value for this target */
  nodeOs: string
  /** `process.arch` value for this target */
  nodeCpu: string
}

export const EXE_TARGETS: ExeTarget[] = [
  {
    platform: 'darwin',
    arch: 'arm64',
    nodeOs: 'darwin',
    nodeCpu: 'arm64',
  },
  {
    platform: 'darwin',
    arch: 'x64',
    nodeOs: 'darwin',
    nodeCpu: 'x64',
  },
  {
    platform: 'linux',
    arch: 'arm64',
    nodeOs: 'linux',
    nodeCpu: 'arm64',
  },
  {
    platform: 'linux',
    arch: 'x64',
    nodeOs: 'linux',
    nodeCpu: 'x64',
  },
  {
    platform: 'win',
    arch: 'arm64',
    nodeOs: 'win32',
    nodeCpu: 'arm64',
  },
  {
    platform: 'win',
    arch: 'x64',
    nodeOs: 'win32',
    nodeCpu: 'x64',
  },
]

export const pkgName = (t: ExeTarget) =>
  `@vltpkg/vlt-${t.nodeOs}-${t.nodeCpu}`

export const dirName = (t: ExeTarget) =>
  `cli-${t.nodeOs}-${t.nodeCpu}`

export const exeFileName = (t: ExeTarget) =>
  `vlt-${t.platform}-${t.arch}${t.platform === 'win' ? '.exe' : ''}`
