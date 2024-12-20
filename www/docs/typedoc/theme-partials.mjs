// @ts-check

/**
 * @typedef {import('typedoc-plugin-markdown').MarkdownThemeContext['partials']} Partials
 * @typedef {import('typedoc-plugin-markdown').MarkdownPageEvent} Page
 */

/**
 * @template {keyof Partials} K
 * @typedef {Parameters<Partials[K]>[0]} ModelType
 */

/**
 * Wraps a TypeDoc Markdown partial template with a transformation function
 * @template {keyof Partials} K
 * @param {Page} page - The current documentation page being processed
 * @param {Partials} partials - Collection of partial templates
 * @param {K} key - Name of the partial to wrap
 * @param {(result: string, model: ModelType<K>) => string} transformFn - Function to transform the partial output
 */
const wrapPartial = (page, partials, key, transformFn) => ({
  /** @type {(model: ModelType<K>) => string} */
  [key]: (model, ...args) => {
    // Generate the original markdown output
    // @ts-expect-error - complains about the spread args
    const originalResult = partials[key](model, ...args)

    // Apply the transformation
    const transformedResult = transformFn(originalResult, model)

    // Only log changes if enabled and content was modified
    if (
      originalResult !== transformedResult &&
      process.env.VLT_TYPEDOC_LOG_MARKDOWN_FIXES
    ) {
      console.log('='.repeat(20), page.url, key, '='.repeat(20))
      console.log('Original:')
      console.log('-'.repeat(20))
      console.log(originalResult)
      console.log('-'.repeat(20))
      console.log('Transformed:')
      console.log('-'.repeat(20))
      console.log(transformedResult)
    }

    return transformedResult
  },
})

/**
 * @param {string} res
 * @param {(s: string) => string} map
 * @param {string=} delim
 */
const mapParts = (res, map, delim = '\n') =>
  res.split(delim).map(map).join(delim)

/** @param {string} res */
const codeBlockIfContainsNewline = res =>
  res.includes('\n') ? codeBlock(res) : res

/** @param {string} res */
const rewrapInlineCodeIfNeeded = res => {
  if (
    res.startsWith('\\`') &&
    res.endsWith('\\`') &&
    res.match(/`/g)?.length === 2
  ) {
    return rewrapInlineCode(res)
  }
  return null
}

/** @param {string} res @param {import('typedoc').SignatureReflection} model */
const isUnwrappedPredicate = (res, model) =>
  !res.startsWith('`') &&
  res.endsWith('`') &&
  model.type?.type === 'predicate'

/** @param {string} res */
const rewrapInlineCode = res => {
  const start = '`` '
  const end = ' ``'
  return `${start}${unEscapeChars(res)}${end}`
}

/**
 * https://github.com/typedoc2md/typedoc-plugin-markdown/blob/main/packages/typedoc-plugin-markdown/src/libs/utils/un-escape-chars.ts
 * MIT License
 * Copyright (c) 2021 Thomas Grey
 * @param {string} str
 */
const unEscapeChars = str =>
  str
    .replace(
      /(`[^`]*?)\\*([^`]*?`)/g,
      (_, p1, p2) => `${p1}${p2.replace(/\*/g, '\\*')}`,
    )
    .replace(/\\\\/g, '\\')
    .replace(/(?<!\\)\*/g, '')
    .replace(/\\</g, '<')
    .replace(/\\>/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\_/g, '_')
    .replace(/\\{/g, '{')
    .replace(/\\}/g, '}')
    .replace(/(?<!\\)`/g, '')
    .replace(/\\`/g, '`')
    .replace(/\\\*/g, '*')
    .replace(/\\\|/g, '|')
    .replace(/\\\]/g, ']')
    .replace(/\\\[/g, '[')
    .replace(/\[([^[\]]*)\]\((.*?)\)/gm, '$1')

/**
 * https://github.com/typedoc2md/typedoc-plugin-markdown/blob/main/packages/typedoc-plugin-markdown/src/libs/markdown/code-block.ts
 * MIT License
 * Copyright (c) 2021 Thomas Grey
 * @param {string} content
 */
const codeBlock = content => {
  /** @param {string} content */
  const trimLastLine = content => {
    const lines = content.split('\n')
    return lines
      .map((line, index) =>
        index === lines.length - 1 ? line.trim() : line,
      )
      .join('\n')
  }
  const trimmedContent =
    (
      content.endsWith('}') ||
      content.endsWith('};') ||
      content.endsWith('>') ||
      content.endsWith('>;')
    ) ?
      trimLastLine(content)
    : content
  return '```ts\n' + unEscapeChars(trimmedContent) + '\n```'
}

/** @param {Page} page @param {Partials} p */
export const partials = (page, p) => ({
  ...wrapPartial(
    page,
    p,
    'typeAndParent',
    codeBlockIfContainsNewline,
  ),
  ...wrapPartial(
    page,
    p,
    'indexSignature',
    codeBlockIfContainsNewline,
  ),
  ...wrapPartial(page, p, 'parametersList', res =>
    mapParts(res, l => rewrapInlineCodeIfNeeded(l) ?? l),
  ),
  ...wrapPartial(page, p, 'signatureReturns', (res, model) =>
    mapParts(
      res,
      l =>
        rewrapInlineCodeIfNeeded(l) ??
        (isUnwrappedPredicate(l, model) ?
          rewrapInlineCode(l)
        : mapParts(
            l,
            union => rewrapInlineCodeIfNeeded(union) ?? union,
            ' \\| ',
          )),
    ),
  ),
})
