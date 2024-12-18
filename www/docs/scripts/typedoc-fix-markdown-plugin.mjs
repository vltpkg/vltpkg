// @ts-check
import { basename } from 'path'
import { MarkdownPageEvent } from 'typedoc-plugin-markdown'

/**
 * @typedef {import('typedoc-plugin-markdown').MarkdownPageEvent} Page
 * @typedef {import('typedoc-plugin-markdown').MarkdownApplication} App
 */

export const modulesFileName = 'reference'

/** @param {Page} page */
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

/**
 * @param {Page} page
 * @param {string} name
 */
const pageEndsWith = (page, name) =>
  page.url.includes('/') ?
    page.url.endsWith(`/${name}.md`)
  : page.url === `${name}.md`

/** @param {Page} page */
const isReadme = page => pageEndsWith(page, 'index')

/**
 * @param {string} contents
 * @param {string} text
 */
const removeHeading = (contents, text) => {
  const match = new RegExp(`^${text}\n\n`, 'm').exec(contents)
  if (match) {
    return (
      contents.substring(0, match.index) +
      contents.substring(match.index + match[0].length)
    )
  }
  return contents
}

/**
 * @param {string} basename
 * @param {string} contents
 */
const fixIntraPageHashLinks = (basename, contents) => {
  const regex = new RegExp(
    `\\]\\(${basename}\\.md#(?<hash>[^)]+)\\)`,
    'g',
  )
  return contents.replaceAll(
    regex,
    (_match, _p1, _offset, _string, { hash }) => {
      return `](#${hash})`
    },
  )
}

/**
 * @param {App} app
 */
export function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /** @param {Page} page */
    page => {
      const { name, parent, pkg } = getName(page)

      const { frontmatter: fm = {} } = page
      fm.sidebar ??= {}

      if (parent) {
        if (isReadme(page)) {
          fm.title = pkg
          fm.sidebar.order = 0
          fm.sidebar.label = 'Readme'
        } else if (pageEndsWith(page, modulesFileName)) {
          fm.title = pkg
          fm.sidebar.order = 1
          fm.sidebar.label = 'Reference'
        } else {
          fm.title = name === 'index' ? pkg : `${pkg}/${name}`
          fm.sidebar.label = name
        }
      } else {
        fm.title = 'Packages'
        fm.sidebar.hidden = true
      }

      page.frontmatter = fm
    },
  )

  app.renderer.on(
    MarkdownPageEvent.END,
    /** @param {Page} page */
    page => {
      if (!page.contents) return

      const { parent, pkg } = getName(page)

      // remove h1 from the readme page since those get included by astro
      if (isReadme(page) && pkg) {
        page.contents = removeHeading(page.contents, `# ${pkg}`)
      }

      if (!parent) {
        page.contents = page.contents.replaceAll('/index.md)', ')')
        page.contents = removeHeading(page.contents, `## Packages`)
      }

      if (pageEndsWith(page, modulesFileName)) {
        page.contents = page.contents.replace(
          /^(## )Modules(\n\n)/m,
          '$1Entry Points$2',
        )
      }

      if (page.url.endsWith('.md')) {
        // typedoc-plugin-markdown generates intra-page hash links with the
        // page name included at the beginning which end up navigating to a 404.
        // eg `modules.md#some-hash` becomes `#some-hash`
        page.contents = fixIntraPageHashLinks(
          basename(page.url, '.md'),
          page.contents,
        )
      }
    },
  )
}
