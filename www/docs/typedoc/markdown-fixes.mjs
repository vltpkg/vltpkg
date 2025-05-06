// @ts-check

import assert from 'node:assert'
import {
  join,
  resolve,
  dirname,
  sep,
  relative,
} from 'node:path/posix'
import { visit, SKIP } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import {
  typedocBasePath,
  typedocContentPath,
  entryFileName,
  modulesFileName,
} from './constants.mts'
import { slug } from 'github-slugger'

/** @param {string} page */
const fixHeadings =
  page =>
  /**
   * @param {import('mdast').Heading} node
   * @param {number} index
   * @param {import('mdast').Parent} parent
   * @returns {import('unist-util-visit').VisitorResult | void}
   */
  (node, index, parent) => {
    if (
      page === '/index.md' &&
      node.depth === 2 &&
      toString(node) === 'Packages'
    ) {
      // Remove h2 from root list of packages since astro will add the same h1
      parent.children.splice(index, 1)
      return [SKIP, index]
    }

    if (page.endsWith(`/${entryFileName}.md`) && node.depth === 1) {
      // remove h1 from the readme page since those get included by astro
      parent.children.splice(index, 1)
      return [SKIP, index]
    }

    if (
      page.endsWith(`/${modulesFileName}.md`) &&
      node.depth === 2 &&
      toString(node) === 'Modules'
    ) {
      // change Modules to Entry Points for workspaces will multiple entry points.
      // I don't think this can be changed within typedoc or the plugins, and I
      // think this wording makes more sense.
      visit(
        node,
        'text',
        textNode => void (textNode.value = 'Entry Points'),
      )
    }
  }

/** @param {string} page */
const fixLinks =
  page =>
  /**
   * @param {import('mdast').Link} node
   * @returns {import('unist-util-visit').VisitorResult | void}
   */
  node => {
    if (!node.url || /^https?:\/\//.test(node.url)) {
      return
    }

    /** @param {string} p */
    const normalize = p =>
      p
        .replace(/\/index\.md$/, '')
        .replace(/\.md$/, '')
        .replace(/\/$/, '')

    const [path, anchor] = node.url.split('#')
    const normalizedPage = normalize(page)
    const absPath = normalize(resolve(dirname(page), path))
    const anchorSlug =
      anchor ? slug(decodeURIComponent(anchor)) : null

    if (normalizedPage === absPath) {
      node.url = `#${anchorSlug}`
      return
    }

    node.url =
      sep +
      join(typedocBasePath, absPath) +
      (anchorSlug ? `#${anchorSlug}` : '')
  }

/** @type {import('unified').Plugin} */
export default function MarkdownFixes() {
  const { compiler } = this
  assert(compiler, 'must have a compiler')
  this.compiler = (tree, file) => {
    const page =
      sep + relative(join(file.cwd, typedocContentPath), file.path)

    visit(tree, 'link', fixLinks(page))
    visit(tree, 'heading', fixHeadings(page))

    return compiler(tree, file)
  }
}
