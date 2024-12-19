// @ts-check

import assert from 'node:assert'
import { relative, join, posix } from 'node:path'
import { visit, SKIP } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import {
  typedocBasePath,
  typedocContentPath,
  entryFileName,
  modulesFileName,
} from './constants.mjs'

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
    if (
      !node.url ||
      node.url.startsWith('https://') ||
      node.url.startsWith('http://')
    ) {
      return
    }

    const [path, anchor] = node.url.split('#')
    const absPath = posix.resolve(posix.dirname(page), path)

    if (page === absPath) {
      assert(anchor, 'same page links must be a hash')
      node.url = `#${anchor}`
      return
    }

    node.url =
      '/' +
      join(typedocBasePath, absPath).replace(/\.md$/, '') +
      (anchor ? `#${anchor}` : '')
  }

/** @type {import('unified').Plugin} */
export default function MarkdownFixes() {
  const { compiler } = this
  assert(compiler, 'must have a compiler')
  this.compiler = (tree, file) => {
    const page =
      '/' + relative(join(file.cwd, typedocContentPath), file.path)

    visit(tree, 'link', fixLinks(page))
    visit(tree, 'heading', fixHeadings(page))

    return compiler(tree, file)
  }
}
