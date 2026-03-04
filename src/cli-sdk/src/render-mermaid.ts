import { writeFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { error } from '@vltpkg/error-cause'

import { renderMermaidSVG } from 'beautiful-mermaid'

export type OutputFormat = 'svg' | 'png'

/**
 * Replace `#64;` with `@` for display rendering.
 * Mermaid text uses `#64;` to avoid issues with `@` in
 * GitHub/markdown parsers, but SVG/PNG should show `@`.
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

/**
 * Renders mermaid diagram text to a PNG file.
 * Uses `beautiful-mermaid` for SVG, then `@resvg/resvg-wasm`
 * to convert SVG to PNG. Writes to a temp directory.
 * @returns {Promise<string>} The file path of the generated PNG.
 */
export const renderMermaidToPng = async (
  mermaidText: string,
): Promise<string> => {
  const svg = renderMermaidSvg(mermaidText)

  const { Resvg, initWasm } = await import('@resvg/resvg-wasm')
  const { readFile: rf } = await import('node:fs/promises')
  const { createRequire: cr } = await import('node:module')
  const wasmPath = cr(import.meta.url).resolve(
    '@resvg/resvg-wasm/index_bg.wasm',
  )
  try {
    await initWasm(await rf(wasmPath))
  } catch {
    // WASM may already be initialized — ignore
  }
  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  const dir = await mkdtemp(join(tmpdir(), 'vlt-mermaid-'))
  const outputFile = join(dir, 'graph.png')
  await writeFile(outputFile, pngBuffer)

  return outputFile
}
