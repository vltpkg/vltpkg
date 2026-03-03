import { mermaidOutput } from '@vltpkg/graph'
import { urlOpen } from '@vltpkg/url-open'
import { stderr } from './output.ts'
import { ViewClass } from './view.ts'
import type { OutputFormat } from './render-mermaid.ts'
import type { MermaidOutputGraph } from '@vltpkg/graph'

/**
 * A ViewClass that renders mermaid output as SVG or PNG
 * (saved to a temp file and opened).
 *
 * Uses `beautiful-mermaid` for SVG rendering and
 * `@resvg/resvg-wasm` for PNG conversion — no external
 * process spawning.
 */
export class MermaidImageView extends ViewClass<MermaidOutputGraph> {
  format: OutputFormat

  constructor(
    ...args: ConstructorParameters<
      typeof ViewClass<MermaidOutputGraph>
    >
  ) {
    super(...args)
    this.format = this.config.values.view as OutputFormat
  }

  async done(
    result: MermaidOutputGraph,
    _opts: { time: number },
  ): Promise<void> {
    const mermaidText = mermaidOutput(result)

    // Dynamic import to avoid loading render-mermaid eagerly
    const { renderMermaidToFile, renderMermaidToPng } =
      await import('./render-mermaid.ts')

    if (this.format === 'png') {
      stderr(`Generating PNG image...`)
      const filePath = await renderMermaidToPng(mermaidText)
      stderr(`Image saved to: ${filePath}`)
      await urlOpen(filePath)
    } else {
      stderr(`Generating SVG image...`)
      const filePath = await renderMermaidToFile(mermaidText)
      stderr(`Image saved to: ${filePath}`)
      await urlOpen(filePath)
    }
  }
}
