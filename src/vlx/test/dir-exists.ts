import t from 'tap'
import { dirExists } from '../src/dir-exists.ts'

const dir = t.testdir({ file: '' })

t.test('dir exists?', async t => {
  t.equal(await dirExists(dir), true)
  t.equal(await dirExists(dir + '/file'), false)
  t.equal(await dirExists(dir + '/nothing at all'), false)
})
