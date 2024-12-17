export function load(app) {
  app.converter.addUnknownSymbolResolver(
    /** @param {import('typedoc').DeclarationReference} ref */
    ref => {
      if (
        ref.symbolReference?.path?.[0].path === 'ChildProcess' &&
        ref.symbolReference?.path?.[1].path === 'stdio'
      ) {
        return 'https://nodejs.org/api/child_process.html#class-childprocess'
      }
    },
  )
}
