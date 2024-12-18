// @ts-check
import { basename } from 'path'
import { MarkdownPageEvent } from 'typedoc-plugin-markdown'

/**
 * @typedef {import('typedoc-plugin-markdown').MarkdownPageEvent} Page
 * @typedef {import('typedoc-plugin-markdown').MarkdownApplication} App
 */

export const modulesFileName = 'reference'
export const entryFileName = 'index'

/** @param {Page} page */
const getName = page => {
  const name = page.model.name
  const parent = page.model.parent?.name
  const pkg = [parent, name].find(n => n?.startsWith('@vltpkg/'))
  return { name, pkg, isRoot: !parent }
}

/**
 * @param {Page} page
 * @param {string} name
 */
const pageEndsWith = (page, name) =>
  page.url.includes('/') ?
    page.url.endsWith(`/${name}.md`)
  : page.url === `${name}.md`

/**
 * @param {string} text
 * @param {number} level
 */
const headingRegex = (text, level) =>
  new RegExp(
    `^(?<level>${'#'.repeat(level)} )${text}(?<trailer>\n\n)`,
    'm',
  )

/**
 * @param {string} contents
 * @param {string} text
 * @param {number} level
 */
const removeHeading = (contents, text, level) => {
  const match = headingRegex(text, level).exec(contents)
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
  return contents.replaceAll(regex, (...args) => {
    return `](#${args.at(-1).hash})`
  })
}

/**
 * @param {App} app
 */
export function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /** @param {Page} page */
    page => {
      const { name, isRoot, pkg } = getName(page)

      const { frontmatter: fm = {} } = page
      fm.sidebar ??= {}

      if (isRoot) {
        fm.title = 'Packages'
        fm.sidebar.hidden = true
      } else {
        if (pageEndsWith(page, entryFileName)) {
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
      }

      page.frontmatter = fm
    },
  )

  app.renderer.on(
    MarkdownPageEvent.END,
    /** @param {Page} page */
    page => {
      if (!page.contents) return

      const { isRoot, pkg } = getName(page)

      if (isRoot) {
        page.contents = page.contents.replaceAll('/index.md)', ')')
        page.contents = removeHeading(page.contents, `Packages`, 2)
      }

      if (pageEndsWith(page, entryFileName) && pkg) {
        // remove h1 from the readme page since those get included by astro
        page.contents = removeHeading(page.contents, pkg, 1)
      }

      if (pageEndsWith(page, modulesFileName)) {
        page.contents = page.contents.replace(
          headingRegex('Modules', 2),
          (...args) =>
            `${args.at(-1).level}Entry Points${args.at(-1).trailer}`,
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
