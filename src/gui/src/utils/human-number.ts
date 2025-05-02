export const toHumanNumber = (
  number: number,
  options: Intl.NumberFormatOptions = {},
): string => {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
    ...options,
  }).format(number)
}
