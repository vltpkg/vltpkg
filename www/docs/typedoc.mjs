// @ts-check
import { join, relative, resolve } from 'path'
import { readdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import typedocWorkspace from './typedoc.workspace.mjs'

const workspaces = {
  path: 'packages',
  tsconfig: './tsconfig.typedoc-workspaces.json',
  paths: readdirSync(resolve(import.meta.dirname, '../../src'), {
    withFileTypes: true,
  })
    .filter(
      d =>
        d.isDirectory() &&
        typedocWorkspace(join(d.parentPath, d.name)),
    )
    .map(d =>
      relative(import.meta.dirname, join(d.parentPath, d.name)),
    ),
}

await writeFile(
  resolve(import.meta.dirname, workspaces.tsconfig),
  JSON.stringify({
    files: [],
    references: workspaces.paths.map(path => ({
      path,
    })),
  }),
)

/** @type {Partial<
 * import('typedoc').TypeDocOptions &
 * import('typedoc-plugin-markdown').PluginOptions &
 * import('typedoc-plugin-frontmatter/dist/options/option-types').PluginOptions
 * >} */
export default {
  entryPoints: [...workspaces.paths],
  tsconfig: workspaces.tsconfig,
  plugin: [
    'typedoc-plugin-markdown',
    'typedoc-plugin-frontmatter',
    './scripts/workspace-frontmatter.mjs',
  ],
  entryPointStrategy: 'packages',
  outputFileStrategy: 'modules',
  entryFileName: 'index',
  modulesFileName: 'globals',
  mergeReadme: false,
  readme: 'none',
  out: `src/content/docs/${workspaces.path}`,
  cleanOutputDir: true,
  excludeScopesInPaths: true,
  includeVersion: false,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hidePageTitle: true,
  excludeInternal: true,
  excludePrivate: true,
  excludeProtected: true,
  githubPages: false,
  frontmatterGlobals: {
    editUrl: false,
    next: false,
    prev: false,
  },
}
