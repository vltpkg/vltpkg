import { whichSync } from '@vltpkg/which'
import { dirname } from 'path'
import t from 'tap'
import { fileURLToPath } from 'url'
import { which as whichGit } from '../src/which.js'
const mungePath = process.argv[2] === 'mungePath'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

if (mungePath) {
  // munge path so git env is not found
  process.env.PATH = __dirname
}

const er = {
  message: 'No git binary found in $PATH',
  cause: { code: 'ENOGIT' },
}

t.equal(whichGit({ git: 'foo' }), 'foo')
t.equal(whichGit(), whichSync('git'))
t.match(whichGit({ git: false }), er)
process.env.PATH = __dirname
const { which: whichMunged } = await t.mockImport('../src/which.js')
t.match(whichMunged(), er)
