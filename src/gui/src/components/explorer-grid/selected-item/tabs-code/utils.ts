import {
  FileQuestion,
  FileText,
  Folder,
  FolderSymlink,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
import type {
  Language,
  FsItemWithNone,
} from '@/components/explorer-grid/selected-item/tabs-code/types.ts'
import type { ReadOpItem } from '@/lib/fetch-fs.ts'

export const getPackageContentIcon = (
  type: FsItemWithNone['type'],
): LucideIcon | undefined => {
  switch (type) {
    case 'file':
      return FileText
    case 'directory':
      return Folder
    case 'symlink':
      return FolderSymlink
    case 'other':
      return FileQuestion
    case 'none':
      return undefined
  }
}

/**
 * Best-effort language detection for code blocks from file extension/mime.
 */
export const guessLanguage = (
  ext?: string | null,
  mime?: string,
): Language | undefined => {
  const e = (ext ?? '').toLowerCase()
  if (mime?.includes('markdown')) return 'markdown'
  switch (e) {
    case 'md':
    case 'markdown':
    case 'mdc':
    case 'mdx':
      return 'markdown'
    case 'ts':
      return 'typescript'
    case 'tsx':
      return 'tsx'
    case 'js':
    case 'mjs':
    case 'ejs':
      return 'javascript'
    case 'jsx':
      return 'jsx'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'html':
      return 'html'
    case 'txt':
      return 'text'
    default:
      return undefined
  }
}

/**
 * Remove all leading '/' characters from a string.
 */
export const stripLeadingSlashes = (value: string): string => {
  let v = value
  while (v.startsWith('/')) v = v.slice(1)
  return v
}

/**
 * Remove all trailing '/' characters from a string.
 */
export const stripTrailingSlashes = (value: string): string => {
  let v = value
  while (v.endsWith('/')) v = v.slice(0, -1)
  return v
}

/**
 * Normalize a relative path: trim, drop leading/trailing slashes,
 * and collapse duplicate separators.
 */
export const normalizeRelPath = (value?: string): string => {
  const raw = value ?? ''
  const noEdges = stripTrailingSlashes(
    stripLeadingSlashes(raw.trim()),
  )
  if (!noEdges) return ''
  return noEdges.split('/').filter(Boolean).join('/')
}

/**
 * Split a relative path into non-empty segments.
 */
export const splitPathSegments = (value?: string): string[] => {
  const norm = normalizeRelPath(value)
  return norm ? norm.split('/') : []
}

/**
 * Build breadcrumbs from a root absolute path to a target absolute path.
 * Returns an array of { name, path } from the root to the target.
 */
export const buildCrumbsFromAbsolute = (
  rootAbsolutePath: string,
  absolutePath: string,
): { name: string; path: string }[] => {
  // Normalize Windows paths to a consistent POSIX-like form:
  // - Convert backslashes to '/'
  // - Insert missing drive colon (e.g., 'C/..' -> 'C:/..')
  // - Collapse duplicate '/'
  const toNormalizedAbsolute = (p: string): string => {
    let s = p.replace(/\\/g, '/')
    // If it already has a drive colon, keep it; otherwise, add when looks like 'C/...'
    if (!/^[A-Za-z]:/.test(s) && /^[A-Za-z]\//.test(s)) {
      s = `${s[0]}:/${s.slice(2)}`
    }
    // Collapse duplicate slashes
    s = s.replace(/\/+/, '/').replace(/\/+/, '/') // fast-path for common cases
    s = s.replace(/\/+/g, '/') // full collapse as fallback
    // Ensure exactly one slash after drive colon
    s = s.replace(/^([A-Za-z]:)\/+/, '$1/')
    return s
  }

  const root = stripTrailingSlashes(
    toNormalizedAbsolute(rootAbsolutePath),
  )
  const abs = stripTrailingSlashes(toNormalizedAbsolute(absolutePath))
  if (abs === root) return []
  const prefix = `${root}/`
  const rel = abs.startsWith(prefix) ? abs.slice(prefix.length) : abs
  const parts = rel.split('/').filter(Boolean)
  let acc = root
  const crumbs: { name: string; path: string }[] = []
  for (const part of parts) {
    acc = `${acc}/${part}`
    crumbs.push({ name: part, path: acc })
  }
  return crumbs
}

/**
 * Convert breadcrumbs and optional filename into URL path segments.
 */
export const breadcrumbsToSegments = (
  breadcrumbs: { name: string; path: string }[],
  fileName?: string,
): string[] => {
  const dirSegments = breadcrumbs.map(b => b.name).filter(Boolean)
  return fileName ? [...dirSegments, fileName] : dirSegments
}

/**
 * Shallow equality check for two arrays of path segments.
 */
export const isSameSegments = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((seg, i) => seg === b[i])

/**
 * Decide whether to skip the initial URL sync to avoid overwriting
 * deep-link URLs before internal state has hydrated.
 */
export const shouldDeferInitialUrlSync = (
  codePath: string | undefined,
  breadcrumbs: { name: string; path: string }[],
  selectedPackageContentItem: ReadOpItem | null,
): boolean => {
  return Boolean(
    codePath &&
      breadcrumbs.length === 0 &&
      !selectedPackageContentItem,
  )
}

/**
 * Parse a GitHub-style line hash (e.g., "#L10" or "#L10-L20") into a tuple.
 */
export const parseLineHash = (
  hash?: string,
): [number, number] | null => {
  if (!hash) return null
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (!h.startsWith('L')) return null
  const body = h.slice(1)
  if (!body) return null
  const parts = body.split('-')
  const start = Number(parts[0])
  if (!Number.isFinite(start) || start <= 0) return null
  if (parts.length === 1) return [start, start]
  const maybeEnd =
    parts[1]?.startsWith('L') ? parts[1].slice(1) : parts[1]
  const end = Number(maybeEnd)
  if (!Number.isFinite(end) || end <= 0) return [start, start]
  const s = Math.min(start, end)
  const e = Math.max(start, end)
  return [s, e]
}

/**
 * Build a line hash from a tuple. Returns empty string when null/undefined.
 */
export const buildLineHash = (
  sel?: [number, number] | null,
): string => {
  if (!sel) return ''
  const [s, e] = sel
  if (!Number.isFinite(s) || !Number.isFinite(e)) return ''
  return s === e ? `#L${s}` : `#L${s}-L${e}`
}

/**
 * Compare two line ranges for equality.
 */
export const isSameLineRange = (
  a?: [number, number] | null,
  b?: [number, number] | null,
): boolean => {
  if (!a && !b) return true
  if (!a || !b) return false
  return a[0] === b[0] && a[1] === b[1]
}
