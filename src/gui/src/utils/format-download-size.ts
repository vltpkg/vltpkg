export const formatDownloadSize = (size: number): string => {
  if (size < 1024) {
    return `${size.toFixed(0)} B`
  }

  const sizeInKB = size / 1024
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
