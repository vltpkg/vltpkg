import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Application } from 'typedoc'
import type { TypeDocOptions } from 'typedoc'
import { MarkdownPageEvent } from 'typedoc-plugin-markdown'
import type { PluginOptions } from 'typedoc-plugin-markdown'
// eslint-disable-next-line import/extensions -- shared with each src workspace's typedoc.mjs
import typedocWorkspace from '../typedoc.workspace.mjs'

const srcDir = resolve(import.meta.dirname, '../../../src')
const wanted = process.env.VLT_TYPEDOC_WORKSPACES?.split(',')
const check = process.argv.includes('--check')

const entryPoints = readdirSync(srcDir, { withFileTypes: true })
  .filter(
    d => d.isDirectory() && (!wanted || wanted.includes(d.name)),
  )
  .map(d => resolve(srcDir, d.name))
  .filter(dir => typedocWorkspace(dir))

const packageOptions: Partial<TypeDocOptions> = {
  excludeInternal: true,
  excludeExternals: true,
  excludePrivate: true,
  excludeProtected: true,
  // cli-sdk has a pre-existing @types/react 18 vs ink/react 19 type error that fails conversion
  skipErrorChecking: true,
  externalSymbolLinkMappings: {
    'path-scurry': { '*': 'https://isaacs.github.io/path-scurry/' },
    'lru-cache': { '*': 'https://isaacs.github.io/node-lru-cache/' },
  },
}

const markdownOptions: Partial<PluginOptions> = {
  entryFileName: 'index',
  modulesFileName: 'reference',
  outputFileStrategy: 'modules',
  excludeScopesInPaths: true,
  useCodeBlocks: true,
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hidePageTitle: true,
  parametersFormat: 'table',
  interfacePropertiesFormat: 'table',
  classPropertiesFormat: 'table',
  enumMembersFormat: 'table',
  propertyMembersFormat: 'table',
  typeDeclarationFormat: 'table',
  indexFormat: 'table',
  // typedoc merges flags over their defaults, so a partial object is fine;
  // modifiers are nearly all `public` (private/protected are excluded) and cost a column
  tableColumnSettings: {
    hideModifiers: true,
    hideSources: true,
    leftAlignHeaders: true,
  } as PluginOptions['tableColumnSettings'],
}

const app = await Application.bootstrapWithPlugins({
  ...packageOptions,
  packageOptions: packageOptions as TypeDocOptions,
  entryPoints,
  entryPointStrategy: 'packages',
  plugin: ['typedoc-plugin-markdown'],
  readme: 'none',
  out: resolve(
    import.meta.dirname,
    '../content/client/api-reference',
  ),
  cleanOutputDir: true,
  ...markdownOptions,
})

// `{@link ChildProcess.stdio}` in promise-spawn names a node type typedoc can't resolve
app.converter.addUnknownSymbolResolver(ref =>
  (
    ref.symbolReference?.path?.map(p => p.path).join('.') ===
    'ChildProcess.stdio'
  ) ?
    'https://nodejs.org/api/child_process.html#class-childprocess'
  : undefined,
)

// fumadocs requires a frontmatter title on every page
app.renderer.on(MarkdownPageEvent.END, page => {
  const { name, parent } = page.model
  const title =
    !parent ? 'API Reference'
    : page.url.endsWith('/reference.md') ? 'Reference'
    : name
  // jackspeak's option types are anonymous objects that print as `object & object & …` (~55 of them)
  const contents = (page.contents ?? '').replace(
    /(`?)object\1(?: & (`?)object\2)+/g,
    '…',
  )
  page.contents = `---\ntitle: ${JSON.stringify(title)}\n---\n\n${contents}`
})

const project = await app.convert()
if (!project) process.exit(1)
if (check) {
  // notExported and invalidLink are on by default; as with the CLI's
  // --treatValidationWarningsAsErrors, any validation warning fails and nothing is written
  const warnings = app.logger.warningCount
  app.validate(project)
  process.exit(
    app.logger.hasErrors() || app.logger.warningCount > warnings ?
      1
    : 0,
  )
}
await app.generateOutputs(project)
