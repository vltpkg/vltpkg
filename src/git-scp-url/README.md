# `@vltpkg/git-scp-url`

Utility function for parsing git "scp-style" URLs, like
`git:git@github.com:user/repo` or
`git+ssh://github.com:user/repo`.

## USAGE

```js
import { gitScpURL } from '@vltpkg/git-scp-url'
console.log(gitScpURL('git@github.com:user/repo'))
/*
URL {
  href: 'git+ssh://git@github.com/user/repo',
  // NB: this is only set if the url is http: or https:
  origin: 'null',
  protocol: 'git+ssh:',
  username: 'git',
  password: '',
  host: 'github.com',
  hostname: 'github.com',
  port: '',
  pathname: '/user/repo',
  search: '',
  searchParams: URLSearchParams {},
  hash: ''
}
*/
```
