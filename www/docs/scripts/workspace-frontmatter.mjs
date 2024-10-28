// @ts-check
import { MarkdownPageEvent } from 'typedoc-plugin-markdown'

/**
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app
 */
export function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
    page => {
      const name = page.model.name
      const parentName = page.model.parent?.name
      const [label, order] =
        parentName ?
          page.url.endsWith('/index.md') ? ['Readme', 0]
          : page.url.endsWith('/globals.md') ? ['Globals', 1]
          : [`${name}.js`]
        : ['Packages', 0]
      page.frontmatter = {
        title:
          parentName ?
            `${parentName.startsWith('@vltpkg/') ? parentName : name} | ${label}`
          : label,
        ...page.frontmatter,
        sidebar: {
          label,
          order,
        },
      }
    },
  )
  app.renderer.on(
    MarkdownPageEvent.END,
    /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
    page => {
      if (!page.model.parent?.name) {
        page.contents = page.contents?.replaceAll('/index.md)', ')')
      }
    },
  )
}
