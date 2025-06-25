import {
  decompressFromEncodedURIComponent,
  compressToEncodedURIComponent,
} from 'lz-string'

export const decodeCompressedQuery = (query: string): string => {
  return decompressFromEncodedURIComponent(query)
}

export const encodeCompressedQuery = (query: string): string => {
  return compressToEncodedURIComponent(query)
}
