// @ts-check
import { join, relative, resolve } from 'path'
import { readdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import typedocWorkspace from './typedoc.workspace.mjs'
import { spawnSync } from 'child_process'

// typedoc can do this for us, but vercel does not setup
// the necessary git checks or remote that typedoc needs.
// So we do the same thing locally so we can ensure that
// it works with this configuration.
const gitRevision = (() => {
  const { VERCEL_GIT_COMMIT_SHA } = process.env
  if (VERCEL_GIT_COMMIT_SHA) {
    return VERCEL_GIT_COMMIT_SHA
  }
  const res = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf-8',
  })
  if (res.status !== 0) {
    throw new Error('command failed', { cause: res })
  }
  return res.stdout.trim()
})()

const { tsconfig, entryPoints } = await (async () => {
  const srcWorkspaces = readdirSync(
    resolve(import.meta.dirname, '../../src'),
    {
      withFileTypes: true,
    },
  )
    .filter(
      d =>
        d.isDirectory() &&
        typedocWorkspace(join(d.parentPath, d.name)),
    )
    .map(d =>
      relative(import.meta.dirname, join(d.parentPath, d.name)),
    )

  const generatedTsconfig = './tsconfig.typedoc-workspaces.json'
  await writeFile(
    resolve(import.meta.dirname, generatedTsconfig),
    JSON.stringify(
      {
        files: [],
        references: srcWorkspaces.map(path => ({ path })),
      },
      null,
      2,
    ) + '\n',
  )

  return {
    tsconfig: generatedTsconfig,
    entryPoints: srcWorkspaces,
  }
})()

/**
 * @type {Partial<import('typedoc-plugin-markdown').PluginOptions>}
 */
const markdownOptions = {
  mergeReadme: false,
  entryFileName: 'index',
  modulesFileName: 'modules',
  outputFileStrategy: 'modules',
  excludeScopesInPaths: true,
  useCodeBlocks: true,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hidePageTitle: true,
}

/**
 * @type {Partial<import('typedoc-plugin-remark').PluginOptions>}
 */
const remarkOptions = {
  remarkPlugins: ['unified-prettier'],
}

/**
 * @type {Partial<import('typedoc-plugin-frontmatter').PluginOptions>}
 */
const frontmatterOptions = {
  frontmatterGlobals: {
    editUrl: false,
    next: false,
    prev: false,
  },
}

/**
 * @type {Partial<import('typedoc').TypeDocOptions>}}
 */
const packageOptions = {
  includeVersion: false,
  githubPages: false,
  excludeInternal: true,
  excludePrivate: true,
  excludeProtected: true,
  externalSymbolLinkMappings: {
    'path-scurry': {
      '*': 'https://isaacs.github.io/path-scurry/',
    },
    'lru-cache': {
      '*': 'https://isaacs.github.io/node-lru-cache/',
    },
  },
  gitRevision,
  disableGit: true,
  sourceLinkTemplate: `https://github.com/vltpkg/vltpkg/blob/{gitRevision}/{path}#L{line}`,
}

/**
 * @type {Partial<import('typedoc').TypeDocOptions>}
 */
const rootTypedocOptions = {
  // root options specify to use packages strategy for all workspaces
  entryPoints,
  entryPointStrategy: 'packages',
  tsconfig,
  // plugins
  plugin: [
    'typedoc-plugin-markdown',
    'typedoc-plugin-remark',
    'typedoc-plugin-frontmatter',
    './scripts/workspace-frontmatter.mjs',
    './scripts/external-link-plugin.mjs',
  ],
  // do not use a readme for the root
  readme: 'none',
  // output options
  out: `src/content/docs/packages`,
  cleanOutputDir: true,
  // all of our package options apply to the root also
  ...packageOptions,
}

/**
 * @type {Partial<
 *  Omit<import('typedoc').TypeDocOptions, 'packageOptions'> &
 *  { packageOptions: Partial<import('typedoc').TypeDocOptions> } &
 *  import('typedoc-plugin-markdown').PluginOptions &
 *  import('typedoc-plugin-frontmatter').PluginOptions &
 *  import('typedoc-plugin-remark').PluginOptions
 * >}
 */
export default {
  ...rootTypedocOptions,
  // package options are set for all workspaces
  packageOptions,
  // plugins
  ...markdownOptions,
  ...frontmatterOptions,
  ...remarkOptions,
}
