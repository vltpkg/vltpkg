import { mermaidOutput } from '@vltpkg/graph'
import { urlOpen } from '@vltpkg/url-open'
import { stderr } from './output.ts'
import { ViewClass } from './view.ts'
import type { MermaidOutputGraph } from '@vltpkg/graph'

/**
 * A ViewClass that renders mermaid output as an SVG, saved to a temp file
 * and opened.
 *
 * Uses `beautiful-mermaid` — no external process spawning. PNG output was
 * dropped with `--view=png`: it went through `@resvg/resvg-wasm`, and the
 * compiled binary has no WebAssembly host to run it.
 */
export class MermaidImageView extends ViewClass<MermaidOutputGraph> {
  async done(
    result: MermaidOutputGraph,
    _opts: { time: number },
  ): Promise<void> {
    const mermaidText = mermaidOutput(result)
    // Dynamic import to avoid loading render-mermaid eagerly
    const { renderMermaidToFile } =
      await import('./render-mermaid.ts')
    stderr(`Generating SVG image...`)
    const filePath = await renderMermaidToFile(mermaidText)
    stderr(`Image saved to: ${filePath}`)
    await urlOpen(filePath)
  }
}
