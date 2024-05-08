import * as git from '../src/index.js'
import t from 'tap'
t.matchOnly(git, Object.assign(Object.create(null), {
  clone: Function,
  GitConnectionError: /GitConnectionError/,
  GitPathspecError: /GitPathspecError/,
  GitUnknownError: /GitUnknownError/,
  GitError: /GitError/,
  find: Function,
  isClean: Function,
  is: Function,
  revs: Function,
  spawn: Function,
  shallowHosts: Set,
}))
