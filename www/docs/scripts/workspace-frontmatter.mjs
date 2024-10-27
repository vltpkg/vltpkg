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
      const { url, frontmatter, model } = page
      const name = model.name
      const parentName = model.parent?.name ?? ''

      let title
      let order
      let label

      if (!parentName) {
        title = 'Packages'
        order = 0
        console.log(page.contents)
        page.contents = page.contents?.replaceAll('/index.md)', ')')
        console.log(page.contents)
      } else {
        if (url.endsWith('/index.md')) {
          label = 'Readme'
          order = 0
        } else if (url.endsWith('/globals.md')) {
          label = 'Globals'
          order = 1
        } else {
          label = `${name}.js`
        }
        title = `${parentName.startsWith('@vltpkg/') ? parentName : name} | ${label}`
      }

      page.frontmatter = {
        title,
        ...frontmatter,
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
        console.log(page.contents)
        page.contents = page.contents?.replaceAll('/index.md)', ')')
        console.log(page.contents)
      }
    },
  )
}
