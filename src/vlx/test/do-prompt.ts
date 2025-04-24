import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { doPrompt } from '../src/do-prompt.ts'

t.test('do prompts', async t => {
  const spec = Spec.parse('foo@1.2.3')
  const resolved = 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz'
  const dir = t.testdirName
  t.equal(await doPrompt(spec, dir, resolved), true)

  const yes = ['y', 'Yes', '', '\n']
  const no = ['n', 'No', 'asdfasdf']
  for (const y of yes) {
    t.equal(
      await doPrompt(
        spec,
        dir,
        resolved,
        async (s: Spec, d: string, r: string) => {
          t.equal(s, spec)
          t.equal(d, dir)
          t.equal(r, resolved)
          return y
        },
      ),
      true,
    )
  }
  for (const n of no) {
    t.equal(
      await doPrompt(
        spec,
        dir,
        resolved,
        async (s: Spec, d: string, r: string) => {
          t.equal(s, spec)
          t.equal(d, dir)
          t.equal(r, resolved)
          return n
        },
      ),
      false,
    )
  }
})
