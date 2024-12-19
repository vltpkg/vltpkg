// @ts-check

/** @param {import('typedoc-plugin-markdown').MarkdownApplication} app */
export function load(app) {
  /** @param {import('typedoc').DeclarationReference} ref */
  app.converter.addUnknownSymbolResolver(ref => {
    if (
      ref.symbolReference?.path?.[0].path === 'ChildProcess' &&
      ref.symbolReference?.path?.[1].path === 'stdio'
    ) {
      return 'https://nodejs.org/api/child_process.html#class-childprocess'
    }
  })
}
