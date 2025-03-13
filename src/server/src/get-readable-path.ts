import { homedir } from 'os'

const home = homedir()

export const getReadablePath = (path: string) =>
  path.startsWith(home) ? '~' + path.substring(home.length) : path
