import { mermaidOutput } from '@vltpkg/graph'
import { urlOpen } from '@vltpkg/url-open'
import { stderr } from './output.ts'
import { ViewClass } from './view.ts'
import type { ImageFormat } from './render-mermaid.ts'
import type { MermaidOutputGraph } from '@vltpkg/graph'

/**
 * A ViewClass that renders mermaid output to an image file
 * (png, svg, or pdf) and opens it using the system viewer.
 */
export class MermaidImageView extends ViewClass<MermaidOutputGraph> {
  format: ImageFormat

  constructor(
    ...args: ConstructorParameters<
      typeof ViewClass<MermaidOutputGraph>
    >
  ) {
    super(...args)
    this.format = this.config.values.view as ImageFormat
  }

  async done(result: MermaidOutputGraph): Promise<void> {
    const mermaidText = mermaidOutput(result)
    const nodeCount = result.nodes.length

    stderr(`Generating ${this.format} image...`)

    // Dynamic import to avoid loading render-mermaid eagerly
    const { renderMermaid } = await import('./render-mermaid.ts')
    const filePath = await renderMermaid(
      mermaidText,
      this.format,
      nodeCount,
    )

    stderr(`Image saved to: ${filePath}`)
    await urlOpen(filePath)
  }
}
