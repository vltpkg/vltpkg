// @ts-check

import { MarkdownPageEvent } from 'typedoc-plugin-markdown'
import { entryFileName, modulesFileName } from './constants.mjs'

/** @param {import('typedoc-plugin-markdown').MarkdownApplication} app */
export function load(app) {
  /** @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page */
  app.renderer.on(MarkdownPageEvent.BEGIN, page => {
    const name = page.model.name
    const parent = page.model.parent?.name
    const pkg = [parent, name].find(n => n?.startsWith('@vltpkg/'))

    const { frontmatter: fm = {} } = page
    fm.sidebar ??= {}

    if (!parent) {
      fm.title = 'Packages'
      fm.sidebar.hidden = true
    } else {
      if (page.url.endsWith(`/${entryFileName}.md`)) {
        fm.title = pkg
        fm.sidebar.order = 0
        fm.sidebar.label = 'Readme'
      } else if (page.url.endsWith(`/${modulesFileName}.md`)) {
        fm.title = pkg
        fm.sidebar.order = 1
        fm.sidebar.label = 'Reference'
      } else {
        fm.title = name === 'index' ? pkg : `${pkg}/${name}`
        fm.sidebar.label = name
      }
    }

    page.frontmatter = fm
  })
}
