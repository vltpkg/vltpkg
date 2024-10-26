<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/55a9538d-5c29-4ee5-b740-46db8b17611a" />
        <h1 align="center">
            <strong>@vltpkg/git-scp-url</strong>
        </h1>
    </a>
</section>

<p align="center">
    Utility function for parsing git "scp-style" URLs, like `git:git@github.com:user/repo` or `git+ssh://github.com:user/repo`.
</p>

## Usage

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
