import * as git from '../src/index.ts'
import t from 'tap'
t.matchOnly(
  git,
  Object.assign(Object.create(null), {
    clone: Function,
    find: Function,
    isClean: Function,
    is: Function,
    getUser: Function,
    revs: Function,
    spawn: Function,
    shallowHosts: Set,
    resolve: Function,
    resolveRef: Function,
  }),
)
