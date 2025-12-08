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

const workspaces = {
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
  'src/registry': {
    entry: [...entry, 'src/bin/**/*.ts'],
    ignoreDependencies: ['@vltpkg/gui', 'esbuild'],
  },
  'www/docs': {
    entry: [
      ...entry,
      // Referenced via <script> tag
      'src/components/sidebar/sidebar-states.ts',
    ],
    // TODO: audit if these really need to be hoisted
    ignoreDependencies: ['@astrojs/mdx', 'sharp', 'vite'],
  },
  'infra/build': {
    entry: [...entry, 'src/postinstall.cjs'],
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
  ignoreDependencies: ['@eslint/js', 'typescript-eslint', 'typedoc'],
  ignore: [
    '**/tap-snapshots/**/*.cjs',
    './infra/cli-benchmarks/fixtures/**',
  ],
  ignoreBinaries: ['hyperfine', 'vlt', 'sleep'],
  eslint: ['eslint.config.mjs'],
  workspaces: Object.fromEntries(
    getWorkspaces().map(ws => {
      const key = relative(process.cwd(), ws.dir) || '.'
      const workspaceConfig = workspaces as Record<
        string,
        (typeof workspaces)[keyof typeof workspaces]
      >
      return [key, workspaceConfig[key] ?? { entry }]
    }),
  ),
} satisfies KnipConfig
