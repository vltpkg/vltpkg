// @ts-check
import { MarkdownPageEvent } from 'typedoc-plugin-markdown'

/** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
const getName = page => {
  const name = page.model.name
  const parent = page.model.parent?.name
  const pkg = [parent, name].find(n => n?.startsWith('@vltpkg/'))
  return {
    name,
    parent,
    pkg,
  }
}

/** @param {string} url */
const isReadme = url => url.endsWith('/index.md')

/**
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app
 */
export function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
    page => {
      const { name, parent, pkg } = getName(page)

      const [label, order] =
        parent ?
          isReadme(page.url) ? ['Readme', 0]
          : page.url.endsWith('/modules.md') ? ['Modules', 1]
          : [name]
        : ['Workspaces', 0]

      page.frontmatter = {
        title:
          pkg ?
            [label === 'Readme' ? null : label, pkg]
              .filter(Boolean)
              .join(' | ')
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
      if (!page.contents) return

      const { parent, pkg } = getName(page)

      if (isReadme(page.url) && pkg) {
        const match = new RegExp(`^# ${pkg}\n\n`, 'm').exec(
          page.contents ?? '',
        )
        if (match) {
          page.contents =
            page.contents.substring(0, match.index) +
            page.contents.substring(match.index + match[0].length)
        }
      }

      if (!parent) {
        page.contents = page.contents.replaceAll('/index.md)', ')')
      }

      // typedoc-plugin-markdown generated intra-page hash links with the
      // page (modules.md in this case) at the beginning which break. so
      // since we know the links are to hash on the same page we remove the page
      if (page.url.endsWith('/modules.md')) {
        page.contents = page.contents.replaceAll(
          /\]\(modules.md#([^)]+)\)/g,
          '](#$1)',
        )
      }
    },
  )
}
