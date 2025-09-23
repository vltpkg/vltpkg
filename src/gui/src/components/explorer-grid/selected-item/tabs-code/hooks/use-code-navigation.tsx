import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  breadcrumbsToSegments,
  isSameSegments,
  shouldDeferInitialUrlSync,
  buildLineHash,
  parseLineHash,
  buildCrumbsFromAbsolute,
} from '@/components/explorer-grid/selected-item/tabs-code/utils.ts'

import type { FsItem, ReadOpItem } from '@/lib/fetch-fs.ts'

export const useCodeNavigation = ({
  breadcrumbs,
  selectedPackageContentItem,
  onCrumbClick,
  onPackageContentItemClick,
  nodeResolvedPath,
}: {
  breadcrumbs: { name: string; path: string }[]
  selectedPackageContentItem: ReadOpItem | null
  onCrumbClick: (crumbPath: string) => void
  onPackageContentItemClick: (item: FsItem) => void
  nodeResolvedPath?: string
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { query = '', '*': codePath } = useParams<{
    query: string
    '*': string
  }>()

  const [selectedLines, setSelectedLines] = useState<
    [number, number] | null
  >(() => parseLineHash(location.hash))

  /**
   * Tracks whether we've reflected internal state to the URL at least once.
   * Used to defer the initial sync to preserve deep-link URLs on first render.
   */
  const hasReflectedUrlOnceRef = useRef(false)

  /**
   * When we imperatively navigate (e.g., breadcrumb click), suppress the
   * very next URL-reflection effect run to avoid racing double updates.
   */
  const suppressNextReflectRef = useRef(false)

  // Sync selected lines with URL hash changes (e.g., back/forward navigation)
  useEffect(() => {
    setSelectedLines(parseLineHash(location.hash))
  }, [location.hash])

  // When breadcrumbs (directory path) change, reset line selection (clears hash)
  useEffect(() => {
    if (!hasReflectedUrlOnceRef.current) return
    setSelectedLines(prev => (prev ? null : prev))
  }, [breadcrumbs])

  // Reflect current crumb/file selection into the URL
  useEffect(() => {
    if (suppressNextReflectRef.current) {
      suppressNextReflectRef.current = false
      hasReflectedUrlOnceRef.current = true
      return
    }
    // Only defer on the very first render to preserve deep links
    if (
      !hasReflectedUrlOnceRef.current &&
      shouldDeferInitialUrlSync(
        codePath,
        breadcrumbs,
        selectedPackageContentItem,
      )
    )
      return

    const relSegments = breadcrumbsToSegments(
      breadcrumbs,
      selectedPackageContentItem?.name,
    )
    const rel = relSegments.join('/')
    const hash = buildLineHash(selectedLines)
    const target =
      rel ?
        `/explore/${query}/code/${rel}${hash}`
      : `/explore/${query}/code${hash}`
    const currentSegmentsPath = (codePath || '')
      .split('/')
      .filter(Boolean)
    const needPath = !isSameSegments(relSegments, currentSegmentsPath)
    const currentHash = window.location.hash || ''
    const needHash = currentHash !== (hash || '')
    if (needPath || needHash) {
      void navigate(target, { replace: true })
    }
    hasReflectedUrlOnceRef.current = true
  }, [
    breadcrumbs,
    selectedPackageContentItem,
    query,
    codePath,
    navigate,
    selectedLines,
  ])

  const onCrumbNavigate = (crumbPath: string) => {
    hasReflectedUrlOnceRef.current = true
    if (nodeResolvedPath) {
      const crumbs = buildCrumbsFromAbsolute(
        nodeResolvedPath,
        crumbPath,
      )
      const relSegments = crumbs.map(c => c.name)
      const target =
        relSegments.length > 0 ?
          `/explore/${query}/code/${relSegments.join('/')}`
        : `/explore/${query}/code`
      suppressNextReflectRef.current = true
      void navigate(target, { replace: true })
    }
    onCrumbClick(crumbPath)
  }
  const onItemNavigate = (item: FsItem) => {
    hasReflectedUrlOnceRef.current = true
    onPackageContentItemClick(item)
  }

  return {
    onCrumbNavigate,
    onItemNavigate,
    selectedLines,
    setSelectedLines,
  }
}
