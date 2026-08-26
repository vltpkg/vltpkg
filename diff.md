## Lockfile diff

`f9956d13~1` → `f9956d13`

**+50** packages · **+304** edges · 263 changes · 65 hidden

### Major versions

| Package | From | To | Reaches |
| --- | --- | --- | --- |
| `c8` | `10.1.3` | `12.0.0` | 41 workspaces |
| `cliui` | `8.0.1` | `9.0.1` | www/docs |
| `test-exclude` | `7.0.2` | `8.0.0` | 41 workspaces |
| `yargs` | `17.7.3` | `18.1.0` | www/docs |

### Removed

| Package | From | To | Reaches |
| --- | --- | --- | --- |
| `require-directory` | `2.1.1` |  | www/docs |

### Workspaces

<details><summary><b>www/docs</b> — 151 changes in 26 trees</summary>

```
· vite
└─ ^ rollup  4.62.2 → 4.62.4
   ├─ + @napi-rs/lzma-linux-x64-gnu  1.5.1
   ├─ ^ @rollup/rollup-android-arm-eabi  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-android-arm64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-darwin-arm64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-darwin-x64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-freebsd-arm64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-freebsd-x64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-arm-gnueabihf  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-arm-musleabihf  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-arm64-gnu  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-arm64-musl  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-loong64-gnu  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-loong64-musl  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-ppc64-gnu  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-ppc64-musl  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-riscv64-gnu  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-riscv64-musl  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-s390x-gnu  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-x64-gnu  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-linux-x64-musl  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-openbsd-x64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-openharmony-arm64  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-win32-arm64-msvc  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-win32-ia32-msvc  4.62.2 → 4.62.4
   ├─ ^ @rollup/rollup-win32-x64-gnu  4.62.2 → 4.62.4
   └─ ^ @rollup/rollup-win32-x64-msvc  4.62.2 → 4.62.4
· astro
├─ · boxen
│  └─ · ansi-align
│     └─ ~ string-width
│        ├─ ~ emoji-regex
│        ├─ ~ is-fullwidth-code-point
│        └─ ~ strip-ansi
│           └─ ~ ansi-regex
├─ ^ devalue  5.8.1 → 5.9.0
├─ ^ magicast  0.5.3 → 0.5.4
│  ├─ ^ @babel/parser  7.29.7 → 7.29.8
│  └─ ^ @babel/types  7.29.7 → 7.29.8
├─ ^ package-manager-detector  1.7.0 → 1.8.0
├─ ^ smol-toml  1.7.0 → 1.8.0
├─ ^ tinyexec  1.2.4 → 1.3.0
├─ ^ unifont  0.7.4 → 0.7.5
│  └─ + undici  8.10.0
├─ · unstorage
│  ├─ · chokidar
│  │  └─ ^ readdirp  5.0.0 → 5.1.1
│  └─ · h3
│     └─ ^ node-mock-http  1.0.4 → 1.0.5
└─ · yocto-spinner
   └─ ^ yoctocolors  2.1.2 → 2.2.0
^ @astrojs/check  0.9.9 → 0.9.10
├─ ^ @astrojs/language-server  2.16.12 → 2.16.14
│  ├─ · @volar/language-server
│  │  └─ + vscode-languageserver-protocol  3.18.2
│  │     └─ + vscode-jsonrpc  9.0.1
│  ├─ · volar-service-emmet
│  │  └─ ~ vscode-languageserver-types
│  ├─ · volar-service-yaml
│  │  ├─ ~ vscode-languageserver-types
│  │  └─ · yaml-language-server
│  │     └─ · ajv
│  │        └─ ^ fast-uri  3.1.3 → 3.1.5
│  ├─ · vscode-html-languageservice
│  │  └─ + vscode-languageserver-types  3.18.0
│  ├─ ~ vscode-languageserver-protocol
│  ├─ ~ vscode-languageserver-types
│  └─ ~ yaml
└─ ^^ yargs  17.7.3 → 18.1.0
   ├─ ^^ cliui  8.0.1 → 9.0.1
   ├─ - require-directory  2.1.1
   └─ + yargs-parser  22.0.0
^ @radix-ui/react-popover  1.1.19 → 1.1.23
├─ ^ @radix-ui/react-dismissable-layer  1.1.15 → 1.1.19
│  └─ ^ @radix-ui/react-use-effect-event  0.0.3 → 0.0.5
├─ ^ @radix-ui/react-focus-guards  1.1.4 → 1.1.6
├─ ^ @radix-ui/react-focus-scope  1.1.12 → 1.1.16
├─ ^ @radix-ui/react-popper  1.3.3 → 1.3.7
│  ├─ ^ @radix-ui/react-arrow  1.1.11 → 1.1.15
│  ├─ ^ @radix-ui/react-use-rect  1.1.2 → 1.1.4
│  ├─ ^ @radix-ui/react-use-size  1.1.2 → 1.1.4
│  └─ ^ @radix-ui/rect  1.1.2 → 1.1.3
├─ ^ @radix-ui/react-portal  1.1.13 → 1.1.17
├─ ^ @radix-ui/react-presence  1.1.7 → 1.1.10
│  └─ ^ @radix-ui/react-use-layout-effect  1.1.2 → 1.1.4
└─ - @radix-ui/react-slot  1.3.0
^ @radix-ui/react-dropdown-menu  2.1.20 → 2.1.24
├─ ^ @radix-ui/primitive  1.1.5 → 1.1.7
├─ - @radix-ui/react-compose-refs  1.1.3
├─ - @radix-ui/react-context  1.2.0
├─ ^ @radix-ui/react-id  1.1.2 → 1.1.4
├─ ^ @radix-ui/react-menu  2.1.20 → 2.1.24
│  ├─ ^ @radix-ui/react-collection  1.1.12 → 1.1.15
│  │  ├─ ^ @radix-ui/react-compose-refs  1.1.3 → 1.1.5
│  │  └─ ^ @radix-ui/react-slot  1.3.0 → 1.3.3
│  └─ ^ @radix-ui/react-roving-focus  1.1.15 → 1.1.19
│     └─ ^ @radix-ui/react-use-is-hydrated  0.1.1 → 0.1.3
├─ ^ @radix-ui/react-primitive  2.1.7 → 2.1.10
└─ ^ @radix-ui/react-use-controllable-state  1.2.3 → 1.2.6
· @astrojs/vercel
└─ · @vercel/nft
   └─ ~ glob
      ├─ ~ jackspeak
      │  ├─ ~ @isaacs/cliui
      │  │  ├─ ~ string-width
      │  │  │  ├─ ~ eastasianwidth
      │  │  │  └─ ~ emoji-regex
      │  │  └─ ~ wrap-ansi
      │  └─ ~ @pkgjs/parseargs
      └─ ~ path-scurry
         └─ ~ lru-cache
· @astrojs/tailwind
├─ · autoprefixer
│  ├─ ^ browserslist  4.28.6 → 4.28.8
│  │  ├─ ^ baseline-browser-mapping  2.10.43 → 2.11.14
│  │  ├─ ^ electron-to-chromium  1.5.393 → 1.5.405
│  │  ├─ ^ node-releases  2.0.51 → 2.0.53
│  │  └─ ^ update-browserslist-db  1.2.3 → 1.3.1
│  └─ ^ caniuse-lite  1.0.30001806 → 1.0.30001809
└─ ^ postcss  8.5.19 → 8.5.26
   └─ ^ nanoid  3.3.16 → 3.3.18
· vaul
└─ ^ @radix-ui/react-dialog  1.1.19 → 1.1.23
   ├─ ^ @radix-ui/react-compose-refs  1.1.3 → 1.1.5
   ├─ ^ @radix-ui/react-context  1.2.0 → 1.2.2
   ├─ - @radix-ui/react-presence  1.1.7
   ├─ ^ @radix-ui/react-primitive  2.1.7 → 2.1.10
   └─ ^ @radix-ui/react-slot  1.3.0 → 1.3.3
^ @radix-ui/react-scroll-area  1.2.14 → 1.2.18
├─ ^ @radix-ui/number  1.1.2 → 1.1.3
├─ ^ @radix-ui/react-direction  1.1.2 → 1.1.4
├─ ^ @radix-ui/react-use-callback-ref  1.1.2 → 1.1.4
└─ ^ @radix-ui/react-use-layout-effect  1.1.2 → 1.1.4
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   └─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· @astrojs/mdx
├─ ^ acorn  8.17.0 → 8.18.0
└─ ^ remark-smartypants  3.0.2 → 3.0.3
· @astrojs/react
└─ · @vitejs/plugin-react
   └─ · @babel/core
      ├─ ^ @babel/generator  7.29.7 → 7.29.8
      └─ ^ @babel/traverse  7.29.7 → 7.29.8
· @astrojs/starlight
├─ ~ @types/unist
└─ ^ js-yaml  4.3.0 → 4.3.1
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
^ framer-motion  12.42.2 → 12.43.0
└─ ^ motion-dom  12.42.2 → 12.43.0
+ rehype-autolink-headings
└─ + hast-util-heading-rank  3.0.0
· tailwindcss
└─ ~ postcss-load-config
· @astrojs/sitemap
└─ · sitemap
   └─ ^ sax  1.6.0 → 1.6.1
^ @radix-ui/react-slot  1.3.0 → 1.3.3
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· knip
└─ + yaml  2.9.0
^ prettier  3.9.5 → 3.9.6
+ rehype-slug
· tap
└─ · @tapjs/core
   └─ ~ yaml
```

</details>

<details><summary><b>src/cli-sdk</b> — 51 changes in 14 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
   └─ ^ minimatch  10.2.5 → 10.2.6
· ink
├─ ^ es-toolkit  1.49.0 → 1.50.0
├─ · string-width
│  └─ · strip-ansi
│     └─ ^ ansi-regex  6.2.2 → 6.3.0
└─ + ws  8.21.3
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· knip
└─ + yaml  2.9.0
· minimatch
└─ ^ brace-expansion  5.0.7 → 5.0.9
· pacote
└─ ^ tar  7.5.20 → 7.5.22
· posthog-node
└─ ^ axios  1.18.1 → 1.19.0
^ prettier  3.9.5 → 3.9.6
^ react  19.2.7 → 19.2.8
```

</details>

<details><summary><b>src/package-info</b> — 46 changes in 10 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· pacote
├─ · @npmcli/run-script
│  └─ · node-gyp
│     └─ ^ undici  6.27.0 → 6.28.0
├─ · cacache
│  └─ ^ p-map  7.0.5 → 7.0.6
├─ · npm-registry-fetch
│  └─ · make-fetch-happen
│     └─ · @npmcli/agent
│        └─ · socks-proxy-agent
│           └─ · socks
│              └─ ^ ip-address  10.2.0 → 10.5.0
└─ ^ tar  7.5.20 → 7.5.22
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   └─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· ink
└─ ^ ws  8.21.1 → 8.21.3
^ prettier  3.9.5 → 3.9.6
```

</details>

<details><summary><b>src/tar</b> — 46 changes in 10 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· pacote
├─ · @npmcli/run-script
│  └─ · node-gyp
│     └─ ^ undici  6.27.0 → 6.28.0
├─ · cacache
│  └─ ^ p-map  7.0.5 → 7.0.6
├─ · npm-registry-fetch
│  └─ · make-fetch-happen
│     └─ · @npmcli/agent
│        └─ · socks-proxy-agent
│           └─ · socks
│              └─ ^ ip-address  10.2.0 → 10.5.0
└─ ^ tar  7.5.20 → 7.5.22
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   └─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· ink
└─ ^ ws  8.21.1 → 8.21.3
^ prettier  3.9.5 → 3.9.6
```

</details>

<details><summary><b>src/query</b> — 45 changes in 11 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
   └─ ^ minimatch  10.2.5 → 10.2.6
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· ink
└─ ^ ws  8.21.1 → 8.21.3
· minimatch
└─ ^ brace-expansion  5.0.7 → 5.0.9
^ postcss-selector-parser  7.1.4 → 7.1.5
^ prettier  3.9.5 → 3.9.6
```

</details>

<details><summary><b>src/workspaces</b> — 44 changes in 10 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
   └─ ^ minimatch  10.2.5 → 10.2.6
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· ink
└─ ^ ws  8.21.1 → 8.21.3
· minimatch
└─ ^ brace-expansion  5.0.7 → 5.0.9
^ prettier  3.9.5 → 3.9.6
```

</details>

<details><summary><b>src/cache</b> — 43 changes in 10 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   └─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· ink
└─ ^ ws  8.21.1 → 8.21.3
· knip
└─ + yaml  2.9.0
^ prettier  3.9.5 → 3.9.6
```

</details>

<details><summary><b>src/cache-unzip</b> — 43 changes in 10 trees</summary>

```
^ tap  21.7.4 → 21.7.5
├─ ^ @tapjs/after  3.3.10 → 3.3.11
├─ ^ @tapjs/after-each  4.3.10 → 4.3.11
├─ ^ @tapjs/asserts  4.3.10 → 4.3.11
├─ ^ @tapjs/before  4.3.10 → 4.3.11
├─ ^ @tapjs/before-each  4.3.10 → 4.3.11
├─ ^ @tapjs/chdir  3.3.10 → 3.3.11
├─ ^ @tapjs/core  4.5.8 → 4.5.9
│  └─ ~ yaml
├─ ^ @tapjs/filter  4.3.10 → 4.3.11
├─ ^ @tapjs/fixture  4.3.10 → 4.3.11
├─ ^ @tapjs/intercept  4.3.10 → 4.3.11
├─ ^ @tapjs/mock  4.4.8 → 4.4.9
├─ ^ @tapjs/node-serialize  4.3.10 → 4.3.11
├─ ^ @tapjs/run  4.5.8 → 4.5.9
│  ├─ ^ @tapjs/config  5.6.4 → 5.6.5
│  ├─ ^ @tapjs/reporter  4.4.10 → 4.4.11
│  └─ ^^ c8  10.1.3 → 12.0.0
│     └─ ^^ test-exclude  7.0.2 → 8.0.0
├─ ^ @tapjs/snapshot  4.3.10 → 4.3.11
├─ ^ @tapjs/spawn  4.3.10 → 4.3.11
├─ ^ @tapjs/stdin  4.3.10 → 4.3.11
├─ ^ @tapjs/test  4.4.8 → 4.4.9
├─ ^ @tapjs/typescript  3.5.10 → 3.5.11
└─ ^ @tapjs/worker  4.3.10 → 4.3.11
^ typescript-eslint  8.64.0 → 8.67.0
├─ ^ @typescript-eslint/eslint-plugin  8.64.0 → 8.67.0
│  ├─ ^ @typescript-eslint/type-utils  8.64.0 → 8.67.0
│  └─ ^ @typescript-eslint/visitor-keys  8.64.0 → 8.67.0
└─ ^ @typescript-eslint/parser  8.64.0 → 8.67.0
· @typescript-eslint/utils
└─ ^ @typescript-eslint/typescript-estree  8.64.0 → 8.67.0
   ├─ ^ @typescript-eslint/project-service  8.64.0 → 8.67.0
   └─ ^ @typescript-eslint/tsconfig-utils  8.64.0 → 8.67.0
· typedoc
├─ · markdown-it
│  └─ ^ mdurl  2.0.0 → 2.1.0
├─ · minimatch
│  └─ ^ brace-expansion  2.1.2 → 2.1.4
└─ ~ yaml
· eslint
├─ ^ @eslint-community/eslint-utils  4.9.1 → 4.10.1
└─ · file-entry-cache
   └─ · flat-cache
      └─ ^ flatted  3.4.2 → 3.4.4
· @astrojs/check
└─ · @astrojs/language-server
   └─ ~ yaml
· eslint-plugin-import
└─ · minimatch
   └─ ^ brace-expansion  1.1.16 → 1.1.18
· ink
└─ ^ ws  8.21.1 → 8.21.3
· knip
└─ + yaml  2.9.0
^ prettier  3.9.5 → 3.9.6
```

</details>

_…and 35 more workspaces._

