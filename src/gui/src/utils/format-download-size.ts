export const formatDownloadSize = (
  size: number | null | undefined,
): string => {
  const n = typeof size === 'number' ? size : Number(size)
  if (!Number.isFinite(n)) return '-'
  if (n <= 0) return '0 B'
  if (n < 1024) {
    return `${n.toFixed(0)} B`
  }

  const sizeInKB = n / 1024
  if (sizeInKB < 1024) {
    return `${sizeInKB.toFixed(0)} KB`
  }

  const sizeInMB = sizeInKB / 1024
  if (sizeInMB < 1024) {
    return `${sizeInMB.toFixed(0)} MB`
  }

  const sizeInGB = sizeInMB / 1024
  return `${sizeInGB.toFixed(0)} GB`
}
