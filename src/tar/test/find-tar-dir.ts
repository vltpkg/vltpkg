import t from 'tap'
import { findTarDir } from '../src/find-tar-dir.ts'

t.equal(findTarDir('x', undefined), undefined)
t.equal(findTarDir('x/', undefined), 'x/')
t.equal(findTarDir('x/', 'y/'), 'y/')
t.equal(findTarDir('../x/', undefined), undefined)
t.equal(findTarDir('/x/', undefined), undefined)
t.equal(findTarDir(undefined, undefined), undefined)
t.equal(findTarDir('./x/', undefined), './x/')
t.equal(findTarDir('./x/', './x/'), './x/')
