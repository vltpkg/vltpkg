import type { KnipConfig } from 'knip'
import { getWorkspaces } from './scripts/utils.ts'
import { relative } from 'node:path'

const entry = [
  'src/index.{ts,js,tsx}',
  'src/bins/**/*.{ts,js}',
  'test/**/*.ts',
  'scripts/**/*.{ts,js}',
  'benchmarks/**/*.{ts,js}',
]

const workspaces: KnipConfig['workspaces'] = {
  '.': {
    entry,
    // Used to download fixtures in a bash script
    ignoreDependencies: ['@vltpkg/benchmark'],
    ignore: ['coverage-map.js'],
  },
  'src/cli-sdk': {
    entry: [...entry, 'src/commands/*.ts'],
  },
  'src/server': {
    entry,
    // Used within a resolve-import call
    ignoreDependencies: ['@vltpkg/gui'],
  },
  'www/docs': {
    entry: [
      ...entry,
      'astro.config.mts',
      'src/content/docs/**/*.mdx',
      // Referenced via <script> tag
      'src/components/sidebar/sidebar-states.ts',
      // Starlight overrides manually copied from astro.config.mts
      'src/components/page-frame/page-frame.astro',
      'src/components/content-panel/content-panel.astro',
      'src/components/page-title/page-title.astro',
      'src/components/pagination/pagination.astro',
      'src/components/page-sidebar/page-sidebar.astro',
      'src/components/two-column-layout/two-column-layout.astro',
      'src/components/footer/footer.astro',
      'src/components/theme-select/theme-provider.astro',
    ],
    // TODO: audit if these really need to be hoisted
    ignoreDependencies: ['@astrojs/mdx', 'sharp', 'vite'],
  },
  'infra/cli-compiled': {
    entry: ['postinstall.cjs'],
  },
}

export default {
  // Exclude exports and types because they have false positives
  // from tap.mockImport. Run with `knip --include exports,types` to
  // include them.
  exclude: ['exports', 'types'],
  // These dependencies make it possible to run linting and typedoc
  // from each individual workspaces but that capability to not
  // exercised anywhere yet.
  ignoreDependencies: [
    '@eslint/js',
    '@types/eslint__js',
    'typescript-eslint',
    'typedoc',
  ],
  ignore: ['**/tap-snapshots/**/*.cjs'],
  ignoreBinaries: [
    'hyperfine',
    `cat package.json | jq -r '"(.name)@(.version)"'`,
    'typedoc:check',
  ],
  eslint: ['eslint.config.mjs'],
  workspaces: Object.fromEntries(
    getWorkspaces().map(ws => {
      const key = relative(process.cwd(), ws) || '.'
      return [key, workspaces[key] ?? { entry }]
    }),
  ),
} satisfies KnipConfig
