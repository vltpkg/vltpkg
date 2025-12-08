/**
 * Parses an aria-label from an SVG
 * Used by external-info to get gh stars and issue counts
 *
 * [\d.]+
 * Matches with one or more digits or dots, intentionally loose to match:
 * '1', '12.5', '3.14.15.9' (not enforcing proper decimals)
 *
 * \s
 * Allows any amount of whitespace or none
 *
 * [kmb]?
 * Shorthand for "thousands", "millions" or "billions"
 * An optional letter of: k, m or b. Case-insensitive so it also matches
 * K, M, B
 */
export const parseAriaLabelFromSVG = (
  svg: string,
): string | undefined => {
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
  const ariaLabel = svgDoc
    .querySelector('svg')
    ?.getAttribute('aria-label')
  if (!ariaLabel) return undefined
  const match = /[\d.]+\s*[kmb]?/i.exec(ariaLabel)
  return match?.[0].trim()
}
