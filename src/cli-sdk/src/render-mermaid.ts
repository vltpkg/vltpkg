import { writeFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { error } from '@vltpkg/error-cause'

import { renderMermaidSVG } from 'beautiful-mermaid'

/**
 * Replace `#64;` with `@` for display rendering.
 * Mermaid text uses `#64;` to avoid issues with `@` in
 * GitHub/markdown parsers, but the SVG should show `@`.
 */
const decodeForDisplay = (mermaidText: string): string =>
  mermaidText.replace(/#64;/g, '@')

/**
 * Renders mermaid diagram text to an SVG string using
 * the `beautiful-mermaid` library. No external process
 * is spawned — everything runs in-process.
 * @returns {string} The SVG markup as a string.
 */
export const renderMermaidSvg = (mermaidText: string): string => {
  try {
    return renderMermaidSVG(decodeForDisplay(mermaidText), {
      bg: '#FFFFFF',
      fg: '#27272A',
      padding: 40,
    })
  } catch (cause) {
    throw error('Error rendering SVG', { cause })
  }
}

/**
 * Renders mermaid diagram text to an SVG file.
 * Uses `beautiful-mermaid` in-process, then writes
 * the result to a temp directory.
 * @returns {Promise<string>} The file path of the generated SVG.
 */
export const renderMermaidToFile = async (
  mermaidText: string,
): Promise<string> => {
  const svg = renderMermaidSvg(mermaidText)
  const dir = await mkdtemp(join(tmpdir(), 'vlt-mermaid-'))
  const outputFile = join(dir, 'graph.svg')
  await writeFile(outputFile, svg)
  return outputFile
}
