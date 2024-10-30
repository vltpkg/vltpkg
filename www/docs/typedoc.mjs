// @ts-check
import { join, relative, resolve } from 'path'
import { readdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import typedocWorkspace from './typedoc.workspace.mjs'

const tsconfig = './tsconfig.typedoc-workspaces.json'
const entryPoints = readdirSync(
  resolve(import.meta.dirname, '../../src'),
  {
    withFileTypes: true,
  },
)
  .filter(
    d =>
      d.isDirectory() && typedocWorkspace(join(d.parentPath, d.name)),
  )
  .map(d => relative(import.meta.dirname, join(d.parentPath, d.name)))

await writeFile(
  resolve(import.meta.dirname, tsconfig),
  JSON.stringify(
    {
      files: [],
      references: entryPoints.map(path => ({ path })),
    },
    null,
    2,
  ),
)

/**
 * @type {Partial<
 * import('typedoc').TypeDocOptions &
 * import('typedoc-plugin-markdown').PluginOptions &
 * import('typedoc-plugin-frontmatter/dist/options/option-types').PluginOptions
  >} */
export default {
  entryPoints,
  tsconfig,
  plugin: [
    'typedoc-plugin-markdown',
    'typedoc-plugin-frontmatter',
    './scripts/workspace-frontmatter.mjs',
  ],
  entryPointStrategy: 'packages',
  outputFileStrategy: 'modules',
  entryFileName: 'index',
  mergeReadme: false,
  readme: 'none',
  out: `src/content/docs/packages`,
  cleanOutputDir: true,
  excludeScopesInPaths: true,
  includeVersion: false,
  disableGit: true,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hidePageTitle: true,
  githubPages: false,
  frontmatterGlobals: {
    editUrl: false,
    next: false,
    prev: false,
  },
  externalSymbolLinkMappings: {
    'path-scurry': {
      '*': 'https://isaacs.github.io/path-scurry/',
    },
  },
}
