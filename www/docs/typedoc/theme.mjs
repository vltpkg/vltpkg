import {
  MarkdownTheme,
  MarkdownThemeContext,
} from 'typedoc-plugin-markdown'
import { theme } from './constants.mjs'
import { partials } from './theme-partials.mjs'

export function load(app) {
  app.renderer.defineTheme(
    theme,
    class extends MarkdownTheme {
      getRenderContext(page) {
        const ctx = new MarkdownThemeContext(
          this,
          page,
          this.application.options,
        )
        ctx.partials = {
          ...ctx.partials,
          ...partials(page, ctx.partials),
        }
        return ctx
      }
    },
  )
}
