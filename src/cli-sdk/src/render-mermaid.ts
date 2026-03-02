import { writeFile, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { error } from '@vltpkg/error-cause'
import { promiseSpawn } from '@vltpkg/promise-spawn'

export type ImageFormat = 'png' | 'svg' | 'pdf'

const MIN_WIDTH = 4000
const MAX_WIDTH = 40000

/**
 * Calculate image width based on node count.
 * Starts at 4000px and scales up, capped at 40000px.
 */
export const calculateWidth = (nodeCount: number): number =>
  Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, Math.round(nodeCount * 100)),
  )

/**
 * Renders mermaid diagram text to an image file.
 *
 * Uses `@mermaid-js/mermaid-cli` (mmdc) via npx to generate
 * the image. The output file is written to a temporary directory.
 * @returns {Promise<string>} The path to the generated image file.
 */
export const renderMermaid = async (
  mermaidText: string,
  format: ImageFormat,
  nodeCount: number,
): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'vlt-mermaid-'))
  const inputFile = join(dir, 'input.mmd')
  const outputFile = join(dir, `graph.${format}`)
  const width = calculateWidth(nodeCount)

  await writeFile(inputFile, mermaidText)

  try {
    await promiseSpawn(
      'npx',
      [
        '--yes',
        '@mermaid-js/mermaid-cli',
        '--input',
        inputFile,
        '--output',
        outputFile,
        '--width',
        String(width),
        '--quiet',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
  } catch (cause) {
    throw error('Error generating image', { cause })
  }

  return outputFile
}
