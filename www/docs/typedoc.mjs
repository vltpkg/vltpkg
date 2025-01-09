// @ts-check
import { join, relative, resolve } from 'path'
import { readdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import typedocWorkspace from './typedoc.workspace.mjs'
import { execSync } from 'child_process'
import {
  entryFileName,
  modulesFileName,
  typedocContentPath,
} from './typedoc/constants.mjs'

// typedoc requires an origin remote to render source links.
// there are other typedoc options (sourceLinkTemplate, etc) that
// can be used but they do not play well with the packages strategy
// and will not link to the correct workspace.
if (process.env.VERCEL) {
  const { VERCEL_GIT_REPO_OWNER: owner, VERCEL_GIT_REPO_SLUG: repo } =
    process.env
  const remote = `https://github.com/${owner}/${repo}.git`
  execSync(`git remote add origin ${remote}`)
}

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
    .filter(d => {
      const wanted = process.env.VLT_TYPEDOC_WORKSPACES?.split(',')
      return wanted?.length ? wanted.includes(d.name) : true
    })

  const relWorkspaces = srcWorkspaces.map(d =>
    relative(import.meta.dirname, join(d.parentPath, d.name)),
  )

  const generatedTsconfig = './tsconfig.typedoc-workspaces.json'
  await writeFile(
    resolve(import.meta.dirname, generatedTsconfig),
    JSON.stringify(
      {
        files: [],
        references: relWorkspaces.map(path => ({ path })),
      },
      null,
      2,
    ) + '\n',
  )

  return {
    tsconfig: generatedTsconfig,
    entryPoints: relWorkspaces,
  }
})()

/**
 * @typedef {Partial<import('typedoc-plugin-markdown').PluginOptions>} Markdown
 * @type {Markdown}
 */
const markdownOptions = {
  mergeReadme: false,
  entryFileName,
  modulesFileName,
  outputFileStrategy: 'modules',
  excludeScopesInPaths: true,
  useCodeBlocks: true,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hidePageTitle: true,
}

/**
 * @typedef {Partial<import('typedoc-plugin-remark').PluginOptions>} Remark
 * @type {Remark}
 */
const remarkOptions = {
  remarkPlugins: ['unified-prettier', './typedoc/markdown-fixes.mjs'],
}

/**
 * @typedef {Partial<import('typedoc-plugin-frontmatter').PluginOptions>} Frontmatter
 * @type {Frontmatter}
 */
const frontmatterOptions = {
  frontmatterGlobals: {
    editUrl: false,
    next: false,
    prev: false,
  },
}

/**
 * @typedef {Partial<import('typedoc').TypeDocOptions>} PackageOptions
 * @type {PackageOptions}
 */
const packageOptions = {
  includeVersion: false,
  githubPages: false,
  excludeInternal: true,
  excludeExternals: true,
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
}

/**
 * @typedef {Omit<Partial<import('typedoc').TypeDocOptions>, 'packageOptions'>} TypeDoc
 * @type {TypeDoc}
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
    './typedoc/add-frontmatter.mjs',
    './typedoc/unresolved-links.mjs',
  ],
  // do not use a readme for the root
  readme: 'none',
  // output options
  out: typedocContentPath,
  cleanOutputDir: true,
  // all of our package options apply to the root also
  ...packageOptions,
}

/**
 * @type {TypeDoc & Markdown & Frontmatter & Remark & { packageOptions: PackageOptions }}
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
