import { whichSync } from '@vltpkg/which'
import t from 'tap'
import { which as whichGit } from '../src/which.ts'

const mungePath = process.argv[2] === 'mungePath'

if (mungePath) {
  // munge path so git env is not found
  process.env.PATH = import.meta.dirname
}

const er = {
  message: 'No git binary found in $PATH',
  cause: { code: 'ENOGIT' },
}

t.equal(whichGit({ git: 'foo' }), 'foo')
t.equal(whichGit(), whichSync('git'))
t.match(whichGit({ git: false }), er)
process.env.PATH = import.meta.dirname
const { which: whichMunged } =
  await t.mockImport<typeof import('../src/which.ts')>(
    '../src/which.ts',
  )
t.match(whichMunged(), er)
