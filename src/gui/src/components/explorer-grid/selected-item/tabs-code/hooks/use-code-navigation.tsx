import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  breadcrumbsToSegments,
  isSameSegments,
  shouldDeferInitialUrlSync,
  buildLineHash,
  parseLineHash,
} from '@/components/explorer-grid/selected-item/tabs-code/utils.ts'

import type { FsItem, ReadOpItem } from '@/lib/fetch-fs.ts'

export const useCodeNavigation = ({
  breadcrumbs,
  selectedPackageContentItem,
  onRootClick,
  onCrumbClick,
  onPackageContentItemClick,
}: {
  breadcrumbs: { name: string; path: string }[]
  selectedPackageContentItem: ReadOpItem | null
  onRootClick: () => void
  onCrumbClick: (crumbPath: string) => void
  onPackageContentItemClick: (item: FsItem) => void
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

  const hasReflectedUrlOnceRef = useRef(false)

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
    if (
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

  // Provide wrappers that perform state changes; URL is updated by the effect above
  const onRootNavigate = () => onRootClick()
  const onCrumbNavigate = (crumbPath: string) =>
    onCrumbClick(crumbPath)
  const onItemNavigate = (item: FsItem) =>
    onPackageContentItemClick(item)

  return {
    onRootNavigate,
    onCrumbNavigate,
    onItemNavigate,
    selectedLines,
    setSelectedLines,
  }
}
