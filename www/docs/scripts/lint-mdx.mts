#!/usr/bin/env node
/**
 * Structural lint for authored MDX/Markdown docs content.
 *
 * Catches two classes of "valid markdown, broken page" bugs that
 * neither ESLint nor prettier can see, and that otherwise only
 * surface as build/render-time errors (or silent misrendering):
 *
 * 1. Content escaping a Starlight `<Steps>` block. Steps requires
 *    its content to be a single ordered list; a line indented less
 *    than its step's content indent (like an `<img>` at column 0)
 *    becomes a sibling of the `<ol>` and fails the build with
 *    "expects its content to be a single ordered list".
 * 2. Collapsed aside directives like `:::note Some text :::` on the
 *    opening line — usually prettier's doing — which no longer parse
 *    as an aside. Content must start on the line after `:::type`.
 *
 * Line-based by design: the checks encode indentation contracts that
 * a markdown AST intentionally abstracts away. Generated typedoc
 * content is excluded.
 *
 * Usage: npm run lint:mdx -- [files...]
 * With no arguments, scans src/content/docs (minus typedoc output).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { typedocBasePath } from '../typedoc/constants.mts'

const docsRoot = resolve(
  fileURLToPath(import.meta.url),
  '../../src/content/docs',
)

/** A lint problem found in a file. */
class Problem {
  /**
   * @param {string} file - Path of the offending file.
   * @param {number} line - 1-indexed line number.
   * @param {string} message - Human-readable description.
   */
  constructor(file, line, message) {
    this.file = file
    this.line = line
    this.message = message
  }
}

/**
 * Recursively collect authored .md/.mdx files under a directory,
 * skipping the generated typedoc tree.
 *
 * @param {string} dir - Directory to walk.
 * @returns {string[]} Absolute file paths.
 */
const collectFiles = dir => {
  const files = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (path === join(docsRoot, typedocBasePath)) continue
      files.push(...collectFiles(path))
    } else if (/\.mdx?$/.test(name)) {
      files.push(path)
    }
  }
  return files
}

/** Matches an ordered-list marker and captures everything before the
 * item's content, e.g. `1. `, `12) `, or an indented `2.  `. */
const MARKER = /^(\s*)(\d+[.)])(\s+)/

/**
 * Check every `<Steps>` block in a file: all content must stay
 * inside the ordered list, meaning each non-blank line is either a
 * list-item marker or indented at least as far as the current item's
 * content. Anything shallower (like a component at column 0) becomes
 * a sibling of the `<ol>` and breaks Starlight's Steps contract.
 *
 * @param {string} file - Path used in problem reports.
 * @param {string[]} lines - The file's lines.
 * @returns {Problem[]} Problems found in Steps blocks.
 */
const checkSteps = (file, lines) => {
  const problems = []
  let inSteps = false
  let inFence = false
  let contentIndent = null

  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const trimmed = line.trim()

    if (!inSteps) {
      if (trimmed === '<Steps>') {
        inSteps = true
        contentIndent = null
      }
      return
    }
    if (trimmed === '</Steps>') {
      inSteps = false
      return
    }
    if (trimmed === '') return

    // Ignore fenced code content: its indentation was validated when
    // the fence opened, and fence bodies may contain anything.
    if (/^\s*(```|~~~)/.test(line) && contentIndent !== null) {
      inFence = !inFence
      return
    }
    if (inFence) return

    const marker = MARKER.exec(line)
    if (marker) {
      const [, lead, digits, gap] = marker
      contentIndent = lead.length + digits.length + gap.length
      return
    }

    if (contentIndent === null) {
      problems.push(
        new Problem(
          file,
          lineNo,
          '<Steps> content must begin with an ordered-list item',
        ),
      )
      return
    }

    const indent = /^\s*/.exec(line)[0].length
    if (indent < contentIndent) {
      problems.push(
        new Problem(
          file,
          lineNo,
          `line is indented ${indent} columns but the current step's ` +
            `content starts at column ${contentIndent}, so it falls ` +
            'outside the <Steps> ordered list',
        ),
      )
    }
  })

  return problems
}

/**
 * Check that aside directives open with a bare `:::type` (optionally
 * `[Custom Title]`/`{attrs}`), with content starting on the next
 * line. Prose on the opening line — prettier's collapsed form — is
 * not parsed as an aside.
 *
 * @param {string} file - Path used in problem reports.
 * @param {string[]} lines - The file's lines.
 * @returns {Problem[]} Problems found in aside directives.
 */
const checkAsides = (file, lines) => {
  const problems = []
  lines.forEach((line, idx) => {
    if (/^\s*:::[a-z]+\s+\S/.test(line)) {
      problems.push(
        new Problem(
          file,
          idx + 1,
          'aside content must start on the line after the ' +
            'opening `:::type` marker (this usually means prettier ' +
            'collapsed the directive — use the <Aside> component ' +
            'instead)',
        ),
      )
    }
  })
  return problems
}

/**
 * Lint a single file with every structural check.
 *
 * @param {string} path - Absolute path of the file to lint.
 * @returns {Problem[]} All problems found.
 */
const lintFile = path => {
  const rel = relative(process.cwd(), path)
  const lines = readFileSync(path, 'utf8').split('\n')
  return [...checkSteps(rel, lines), ...checkAsides(rel, lines)]
}

const targets = process.argv.slice(2).map(arg => resolve(arg))
const files = targets.length ? targets : collectFiles(docsRoot)
const problems = files.flatMap(lintFile)

for (const { file, line, message } of problems) {
  console.error(`${file}:${line} ${message}`)
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s) found.`)
  process.exit(1)
}
console.log(`lint-mdx: ${files.length} files OK`)
