// get openapi schema
import wranglerJson from './wrangler.json' with { type: 'json' }
import packageJson from './package.json' with { type: 'json' }
import type {
  OriginConfig,
  CookieOptions,
  ApiDocsConfig,
} from './types.ts'

export const YEAR = new Date().getFullYear()

export const DEV_CONFIG = wranglerJson.dev

export const DAEMON_ENABLED = true as boolean

export const DAEMON_PORT = 3000 as number

export const DAEMON_URL = `http://localhost:${DAEMON_PORT}`

export const VERSION: string = packageJson.version

export const URL = `http://localhost:${DEV_CONFIG.port}`

// how to handle packages requests
export const ORIGIN_CONFIG: OriginConfig = {
  default: 'local',
  upstreams: {
    local: {
      type: 'local',
      url: URL,
      allowPublish: true,
    },
    npm: {
      type: 'npm',
      url: 'https://registry.npmjs.org',
    },
  },
}

// Reserved route prefixes that cannot be used as upstream names
export const RESERVED_ROUTES: string[] = [
  '-',
  'user',
  'docs',
  'search',
  'tokens',
  'auth',
  'ping',
  'package',
  'v1',
  'api',
  'admin',
  '*', // Reserved for hash-based routes
]

// Backward compatibility - maintain old PROXY behavior
export const PROXY: boolean =
  Object.keys(ORIGIN_CONFIG.upstreams).length > 1
export const PROXY_URL: string | undefined =
  ORIGIN_CONFIG.upstreams[ORIGIN_CONFIG.default]?.url

// exposes a publically accessible docs endpoint
export const EXPOSE_DOCS = true

// the domain the registry is hosted on
export const DOMAIN = `http://localhost:${DEV_CONFIG.port}`
export const REDIRECT_URI = `${DOMAIN}/-/auth/callback`

// the time in seconds to cache the registry
export const REQUEST_TIMEOUT: number = 60 * 1000

// cookie options
export const COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
}

// OpenAPI Docs
export const OPEN_API_DOCS = { 
  openapi: '3.1.0',
  info: { 
    title: 'vlt serverless registry', 
    version: VERSION
  }
}

// the docs configuration for the API reference
export const SCALAR_API_DOCS: ApiDocsConfig = {
  metaData: {
    title:  OPEN_API_DOCS.info.title,
  },
  hideModels: false,
  hideDownloadButton: false,
  darkMode: false,
  favicon: '/public/images/favicon/favicon.svg',
  defaultHttpClient: {
    targetKey: 'curl',
    clientKey: 'fetch',
  },
  authentication: {
    http: {
      bearer: {
        token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
      basic: {
        username: 'user',
        password: 'pass',
      },
    },
  },
  hiddenClients: {
    python: true,
    c: true,
    go: true,
    java: true,
    ruby: true,
    shell: ['httpie', 'wget', 'fetch'],
    clojure: true,
    csharp: true,
    kotlin: true,
    objc: true,
    swift: true,
    r: true,
    powershell: false,
    ocaml: true,
    curl: false,
    http: true,
    php: true,
    node: ['request', 'unirest'],
    javascript: ['xhr', 'jquery'],
  },
  spec: {
    content: {
      openapi: OPEN_API_DOCS.openapi,
      servers: [{
        url: `http://localhost:${DEV_CONFIG.port}`,
        description: 'localhost',
      }],
      info: {
        title: `vlt serverless registry`,
        version: VERSION,
        license: {
          identifier: 'FSL-1.1-MIT',
          name: 'Functional Source License, Version 1.1, MIT Future License',
          url: 'https://fsl.software/FSL-1.1-MIT.template.md',
        },
        description: `The **vlt serverless registry** is the modern JavaScript package registry.
        
### Compatible Clients

<table>
  <tbody>
    <tr>
      <td><a href="https://vlt.sh" alt="vlt"><strong><code>vlt</code></strong></a></td>
      <td><a href="https://npmjs.com/package/npm" alt="npm"><strong><code>npm</code></strong></a></td>
      <td><a href="https://yarnpkg.com/" alt="yarn"><strong><code>yarn</code></strong></a></td>
      <td><a href="https://pnpm.io/" alt="pnpm"><strong><code>pnpm</code></strong></a></td>
      <td><a href="https://deno.com/" alt="deno"><strong><code>deno</code></strong></a></td>
      <td><a href="https://bun.sh/" alt="bun"><strong><code>bun</code></strong></a></td>
    </tr>
  </tbody>
</table>

### Features

<ul alt="features">
  <li>Backwards compatible with npm & npm clients</li>
  <li>Granular access control</li>
  <li>Proxying upstream registries when configured</li>
  <li>Package integrity validation for enhanced security</li>
  <li>Minimized JSON responses when header set<br><code>Accept: application/vnd.npm.install-v1+json</code></li>
  <li>Manifest slimming for performance</li>
  <li>Manifest confusion checks on published packages</li>
  <li>Semver range resolution for package manifests</li>
  <li>Support for URL-encoded complex semver ranges<br><code>%3E%3D1.0.0%20%3C2.0.0</code> for <code>>=1.0.0 &lt;2.0.0</code></li>
  <li>Dist-tag management for package versions</li>
  <li>Protected "latest" dist-tag which cannot be deleted</li>
  <li>Dist-tag operations restricted on proxied packages</li>
</ul>

### Resources

<ul alt="resources">
  <li><a href="https://vlt.sh">https://<strong>vlt.sh</strong></a></li>
  <li><a href="https://github.com/vltpkg/vsr">https://github.com/<strong>vltpkg/vsr</strong></a></li>
  <li><a href="https://discord.gg/vltpkg">https://discord.gg/<strong>vltpkg</strong></a></li>
  <li><a href="https://x.com/vltpkg">https://x.com/<strong>vltpkg</strong></a></li>
</ul>

##### Trademark Disclaimer

<p alt="trademark-disclaimer">All trademarks, logos and brand names are the property of their respective owners. All company, product and service names used in this website are for identification purposes only. Use of these names, trademarks and brands does not imply endorsement.</p>

### License

<details alt="license">
<summary><strong>Functional Source License</strong>, Version 1.1, MIT Future License</summary>
<h1>Functional Source License,<br />Version 1.1,<br />MIT Future License</h1>
<h2>Abbreviation</h2>

FSL-1.1-MIT

<h2>Notice</h2>

Copyright ${YEAR} vlt technology inc.

<h2>Terms and Conditions</h2>

<h3>Licensor ("We")</h3>

The party offering the Software under these Terms and Conditions.

<h3>The Software</h3>

The "Software" is each version of the software that we make available under
these Terms and Conditions, as indicated by our inclusion of these Terms and
Conditions with the Software.

<h3>License Grant</h3>

Subject to your compliance with this License Grant and the Patents,
Redistribution and Trademark clauses below, we hereby grant you the right to
use, copy, modify, create derivative works, publicly perform, publicly display
and redistribute the Software for any Permitted Purpose identified below.

<h3>Permitted Purpose</h3>

A Permitted Purpose is any purpose other than a Competing Use. A Competing Use
means making the Software available to others in a commercial product or
service that:

1. substitutes for the Software;

2. substitutes for any other product or service we offer using the Software
that exists as of the date we make the Software available; or

3. offers the same or substantially similar functionality as the Software.

Permitted Purposes specifically include using the Software:

1. for your internal use and access;

2. for non-commercial education;

3. for non-commercial research; and

4. in connection with professional services that you provide to a licensee
using the Software in accordance with these Terms and Conditions.

<h3>Patents</h3>

To the extent your use for a Permitted Purpose would necessarily infringe our
patents, the license grant above includes a license under our patents. If you
make a claim against any party that the Software infringes or contributes to
the infringement of any patent, then your patent license to the Software ends
immediately.

<h3>Redistribution</h3>

The Terms and Conditions apply to all copies, modifications and derivatives of
the Software.

If you redistribute any copies, modifications or derivatives of the Software,
you must include a copy of or a link to these Terms and Conditions and not
remove any copyright notices provided in or with the Software.

<h3>Disclaimer</h3>

THE SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF FITNESS FOR A PARTICULAR
PURPOSE, MERCHANTABILITY, TITLE OR NON-INFRINGEMENT.

IN NO EVENT WILL WE HAVE ANY LIABILITY TO YOU ARISING OUT OF OR RELATED TO THE
SOFTWARE, INCLUDING INDIRECT, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES,
EVEN IF WE HAVE BEEN INFORMED OF THEIR POSSIBILITY IN ADVANCE.

<h3>Trademarks</h3>

Except for displaying the License Details and identifying us as the origin of
the Software, you have no right under these Terms and Conditions to use our
trademarks, trade names, service marks or product names.

<h2>Grant of Future License</h2>

We hereby irrevocably grant you an additional license to use the Software under
the MIT license that is effective on the second anniversary of the date we make
the Software available. On or after that date, you may use the Software under
the MIT license, in which case the following will apply:

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</dialog>`,
      }
    }
  },
  customCss: `@import '${DOMAIN}/public/styles/styles.css';`,
}

