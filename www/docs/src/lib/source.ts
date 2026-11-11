import { defineDocs } from 'fumadocs-mdx/macro'
import { applyMdxPreset } from 'fumadocs-mdx/config'
import { loader } from 'fumadocs-core/source'
import { getBreadcrumbItems } from 'fumadocs-core/breadcrumb'
import type { InferPageType } from 'fumadocs-core/source'
import { pageSchema } from 'fumadocs-core/source/schema'

// the slice of a hast node rehypeCodeMeta touches (hast types aren't a direct dependency)
type HastNode = {
  type: string
  tagName?: string
  data?: { meta?: string | null }
  properties?: Record<string, unknown>
  children?: HastNode[]
}

// a fence's meta (```json title="package.json") isn't a prop, so lift its title onto the <code>
const rehypeCodeMeta = () => (tree: HastNode) => {
  const walk = (node: HastNode) => {
    const title =
      node.tagName === 'code' &&
      node.data?.meta?.match(/title="([^"]*)"/)?.[1]
    if (title) node.properties = { ...node.properties, title }
    node.children?.forEach(walk)
  }
  walk(tree)
}

// `loose` keeps Starlight's `sidebar` frontmatter, which the default schema strips
const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: pageSchema.loose(),
    // components/code-block.tsx highlights on the server, so fumadocs' shiki (rehype-code) is off
    mdxOptions: applyMdxPreset({
      rehypeCodeOptions: false,
      rehypePlugins: [rehypeCodeMeta],
    }),
  },
})

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
  pageTree: {
    transformers: [
      {
        file(node, filePath) {
          const file =
            filePath ? this.storage.read(filePath) : undefined
          const { sidebar } = (file?.data ?? {}) as {
            sidebar?: { label?: string }
          }
          return sidebar?.label ?
              { ...node, name: sidebar.label }
            : node
        },
      },
    ],
  },
})

// typedoc pages share titles across packages ("Reference", "index", "browser"), so name the package too
export const pageTitle = (page: InferPageType<typeof source>) => {
  const [section, folder, pkg, ...rest] = page.slugs
  if (
    section !== 'client' ||
    folder !== 'api-reference' ||
    !pkg ||
    !rest.length
  )
    return page.data.title
  const pkgTitle =
    source.getPage([section, folder, pkg])?.data.title ?? pkg
  return `${pkgTitle}: ${page.data.title}`
}

// content/meta.json spreads registry/ and client/ into the root under `---Registry---` separators, so those
// sections are separators rather than folders; each links to the first page in its group (its quick start)
const groupUrls = new Map(
  source.pageTree.children.flatMap((node, i, nodes) => {
    if (node.type !== 'separator') return []
    const next = nodes.at(i + 1)
    const url =
      next?.type === 'page' ? next.url
      : next?.type === 'folder' ? next.index?.url
      : undefined
    return url ? [[node.name, url] as const] : []
  }),
)

// a page's place in the sidebar tree, e.g. Registry / Using Packages, ending with the page itself
export const breadcrumbs = (url: string) =>
  getBreadcrumbItems(url, source.pageTree, {
    includePage: true,
    includeSeparator: true,
  }).map(item => ({
    ...item,
    url: item.url ?? groupUrls.get(item.name),
  }))
