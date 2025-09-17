import { describe, it, expect } from 'vitest'
import {
  getPackageContentIcon,
  guessLanguage,
  stripLeadingSlashes,
  stripTrailingSlashes,
  normalizeRelPath,
  splitPathSegments,
  buildCrumbsFromAbsolute,
  breadcrumbsToSegments,
  isSameSegments,
  shouldDeferInitialUrlSync,
} from '@/components/explorer-grid/selected-item/tabs-code/utils.ts'
import {
  FileQuestion,
  FileText,
  Folder,
  FolderSymlink,
} from 'lucide-react'

describe('tabs-code/utils', () => {
  describe('getPackageContentIcon', () => {
    it('returns the correct icon for each FsItem type', () => {
      expect(getPackageContentIcon('file')).toBe(FileText)
      expect(getPackageContentIcon('directory')).toBe(Folder)
      expect(getPackageContentIcon('symlink')).toBe(FolderSymlink)
      expect(getPackageContentIcon('other')).toBe(FileQuestion)
      expect(getPackageContentIcon('none')).toBeUndefined()
    })
  })

  describe('guessLanguage', () => {
    it('detects markdown by extension and mime', () => {
      expect(guessLanguage('md')).toBe('markdown')
      expect(guessLanguage('mdx')).toBe('markdown')
      expect(guessLanguage(undefined, 'text/markdown')).toBe(
        'markdown',
      )
    })
    it('detects common languages by extension', () => {
      expect(guessLanguage('ts')).toBe('typescript')
      expect(guessLanguage('tsx')).toBe('tsx')
      expect(guessLanguage('js')).toBe('javascript')
      expect(guessLanguage('jsx')).toBe('jsx')
      expect(guessLanguage('json')).toBe('json')
      expect(guessLanguage('css')).toBe('css')
      expect(guessLanguage('html')).toBe('html')
      expect(guessLanguage('txt')).toBe('text')
    })
    it('returns undefined for unknown extensions', () => {
      expect(guessLanguage('unknown-ext')).toBeUndefined()
      expect(guessLanguage(undefined)).toBeUndefined()
    })
  })

  describe('stripLeadingSlashes', () => {
    it('removes all leading slashes', () => {
      expect(stripLeadingSlashes('///a/b')).toBe('a/b')
      expect(stripLeadingSlashes('/')).toBe('')
      expect(stripLeadingSlashes('a/b')).toBe('a/b')
      expect(stripLeadingSlashes('')).toBe('')
    })
  })

  describe('stripTrailingSlashes', () => {
    it('removes all trailing slashes', () => {
      expect(stripTrailingSlashes('a/b///')).toBe('a/b')
      expect(stripTrailingSlashes('/')).toBe('')
      expect(stripTrailingSlashes('a/b')).toBe('a/b')
      expect(stripTrailingSlashes('')).toBe('')
    })
  })

  describe('normalizeRelPath', () => {
    it('trims and collapses separators, removing edge slashes', () => {
      expect(normalizeRelPath('  /a//b/ ')).toBe('a/b')
      expect(normalizeRelPath('////')).toBe('')
      expect(normalizeRelPath('a/b')).toBe('a/b')
      expect(normalizeRelPath('a///b//c')).toBe('a/b/c')
      expect(normalizeRelPath()).toBe('')
    })
  })

  describe('splitPathSegments', () => {
    it('splits normalized paths into segments', () => {
      expect(splitPathSegments('  /a//b/ ')).toEqual(['a', 'b'])
      expect(splitPathSegments('////')).toEqual([])
      expect(splitPathSegments('a/b/c')).toEqual(['a', 'b', 'c'])
      expect(splitPathSegments()).toEqual([])
    })
  })

  describe('buildCrumbsFromAbsolute', () => {
    it('returns empty crumbs when target equals root', () => {
      const root = '/root/pkg'
      expect(buildCrumbsFromAbsolute(root, root)).toEqual([])
    })
    it('builds crumbs within the root prefix', () => {
      const root = '/root/pkg'
      const target = '/root/pkg/a/b'
      expect(buildCrumbsFromAbsolute(root, target)).toEqual([
        { name: 'a', path: '/root/pkg/a' },
        { name: 'b', path: '/root/pkg/a/b' },
      ])
    })
  })

  describe('breadcrumbsToSegments', () => {
    it('returns only breadcrumb names when no file name provided', () => {
      const crumbs = [
        { name: 'a', path: '/x/a' },
        { name: 'b', path: '/x/a/b' },
      ]
      expect(breadcrumbsToSegments(crumbs)).toEqual(['a', 'b'])
    })
    it('appends file name when provided', () => {
      const crumbs = [
        { name: 'a', path: '/x/a' },
        { name: 'b', path: '/x/a/b' },
      ]
      expect(breadcrumbsToSegments(crumbs, 'c.txt')).toEqual([
        'a',
        'b',
        'c.txt',
      ])
    })
  })

  describe('isSameSegments', () => {
    it('compares path segments shallowly', () => {
      expect(isSameSegments(['a', 'b'], ['a', 'b'])).toBe(true)
      expect(isSameSegments(['a', 'b'], ['a', 'c'])).toBe(false)
      expect(isSameSegments(['a'], ['a', 'b'])).toBe(false)
    })
  })

  describe('shouldDeferInitialUrlSync', () => {
    it('defers when deep link exists and state not hydrated', () => {
      expect(shouldDeferInitialUrlSync('a/b', [], null)).toBe(true)
    })
    it('does not defer when no codePath', () => {
      expect(shouldDeferInitialUrlSync(undefined, [], null)).toBe(
        false,
      )
    })
    it('does not defer when breadcrumbs exist', () => {
      expect(
        shouldDeferInitialUrlSync(
          'a/b',
          [{ name: 'a', path: '/a' }],
          null,
        ),
      ).toBe(false)
    })
    it('does not defer when a file is already selected', () => {
      expect(
        shouldDeferInitialUrlSync('a/b', [], {
          content: 'x',
          encoding: 'utf8',
          mime: 'text/plain',
          ext: 'txt',
          name: 'b',
        }),
      ).toBe(false)
    })
  })
})
