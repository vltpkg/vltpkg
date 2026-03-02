import { mermaidOutput } from '@vltpkg/graph'
import { urlOpen } from '@vltpkg/url-open'
import { stderr, stdout } from './output.ts'
import { ViewClass } from './view.ts'
import type { OutputFormat } from './render-mermaid.ts'
import type { MermaidOutputGraph } from '@vltpkg/graph'

/**
 * A ViewClass that renders mermaid output as SVG (saved to
 * a temp file and opened) or ASCII art (printed to stdout).
 *
 * Uses `beautiful-mermaid` — no external process spawning.
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
    const { renderMermaidToFile, renderMermaidAscii } =
      await import('./render-mermaid.ts')

    if (this.format === 'ascii') {
      const asciiArt = renderMermaidAscii(mermaidText)
      stdout(asciiArt)
    } else {
      stderr(`Generating SVG image...`)
      const filePath = await renderMermaidToFile(mermaidText)
      stderr(`Image saved to: ${filePath}`)
      await urlOpen(filePath)
    }
  }
}
