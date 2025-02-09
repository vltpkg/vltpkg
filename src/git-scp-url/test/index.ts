import { gitScpURL } from '../src/index.ts'
import t from 'tap'

const urls = [
  'git@github.com:user/repo',
  'ssh:git@github.com:user/repo',
  'user:password@github.com:user/repo',
  'user:password@github.com:user/repo#hash',
  'ssh://git@github.com:user/repo',
  'git+ssh://git@github.com/user/repo',
  'foo://user@host.com/repo',
  'foo://user@host.com/repo#hash',
  'hello, this is not a valid url, no matter what we do',
]

// URL fields are non-enumerable getters
t.compareOptions = { includeGetters: true }

t.plan(urls.length * 2)
const results: (URL | undefined)[] = []
for (const u of urls) {
  const r = gitScpURL(u)
  results.push(r)
  t.matchSnapshot(r, u)
  t.strictSame(gitScpURL(u), r, 'memoized test')
}
