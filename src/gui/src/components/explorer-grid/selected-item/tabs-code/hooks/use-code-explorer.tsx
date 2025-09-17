import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { fetchNodeResolvedPath } from '@/lib/fetch-server-graph.ts'
import { fetchFsLs, fetchFsRead } from '@/lib/fetch-fs.ts'
import {
  buildCrumbsFromAbsolute,
  normalizeRelPath,
} from '@/components/explorer-grid/selected-item/tabs-code/utils.ts'

import type { Dispatch, SetStateAction } from 'react'
import type { Error } from '@/components/explorer-grid/selected-item/tabs-code/types.ts'
import type { FsItem, ReadOpItem } from '@/lib/fetch-fs.ts'

const listDirectory = async (
  path: string,
  signal?: AbortSignal,
): Promise<FsItem[]> => {
  return await fetchFsLs({ path, signal })
}

const readFileContent = async (
  path: string,
  signal?: AbortSignal,
): Promise<ReadOpItem> => {
  return await fetchFsRead({ path, encoding: 'utf8', signal })
}

const findChildByName = (
  contents: FsItem[],
  name: string,
): FsItem | undefined => contents.find(i => i.name === name)

const isAbortError = (
  error: unknown,
  signal?: AbortSignal,
): boolean => {
  if (signal?.aborted) return true
  if (typeof error === 'object' && error !== null) {
    const name = (error as { name?: unknown }).name
    return name === 'AbortError'
  }
  return false
}

const updateToDirectory = async (
  targetPath: string,
  rootPath: string | undefined,
  setters: {
    setPackageContents: Dispatch<SetStateAction<FsItem[] | undefined>>
    setBreadcrumbs: Dispatch<
      SetStateAction<{ name: string; path: string }[]>
    >
    setSelectedPackageContentItem: Dispatch<
      SetStateAction<ReadOpItem | null>
    >
  },
  signal?: AbortSignal,
) => {
  const contents = await listDirectory(targetPath, signal)
  setters.setPackageContents(contents)
  if (rootPath) {
    setters.setBreadcrumbs(
      buildCrumbsFromAbsolute(rootPath, targetPath),
    )
  } else {
    setters.setBreadcrumbs([])
  }
  setters.setSelectedPackageContentItem(null)
}

const updateToFile = async (
  targetPath: string,
  setters: {
    setSelectedPackageContentItem: Dispatch<
      SetStateAction<ReadOpItem | null>
    >
  },
  signal?: AbortSignal,
) => {
  const read = await readFileContent(targetPath, signal)
  setters.setSelectedPackageContentItem(read)
}

export const useCodeExplorer = ({
  depId,
  initialRelPath,
}: {
  depId: string | undefined
  initialRelPath?: string
}): {
  loading: boolean
  errors: Error[] | null
  packageContents: FsItem[] | undefined
  nodeResolvedPath: string | undefined
  selectedPackageContentItem: ReadOpItem | null
  setSelectedPackageContentItem: Dispatch<
    SetStateAction<ReadOpItem | null>
  >
  breadcrumbs: { name: string; path: string }[]
  setBreadcrumbs: Dispatch<
    SetStateAction<{ name: string; path: string }[]>
  >
  onPackageContentItemClick: (item: FsItem) => void
  onRootClick: () => void
  onCrumbClick: (crumbPath: string) => void
} => {
  const [loading, setLoading] = useState<boolean>(true)
  const [errors, setErrors] = useState<Error[] | null>(null)
  const [packageContents, setPackageContents] = useState<
    FsItem[] | undefined
  >(undefined)
  const [nodeResolvedPath, setNodeResolvedPath] = useState<
    string | undefined
  >(undefined)
  const [selectedPackageContentItem, setSelectedPackageContentItem] =
    useState<ReadOpItem | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<
    { name: string; path: string }[]
  >([])
  const hasHydratedRef = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setErrors(null)
    setPackageContents(undefined)
    setNodeResolvedPath(undefined)
    setSelectedPackageContentItem(null)
    setBreadcrumbs([])

    if (!depId) {
      setPackageContents([])
      setLoading(false)
      return () => controller.abort()
    }

    setLoading(true)

    const load = async () => {
      try {
        const { path } = await fetchNodeResolvedPath(
          { depId },
          { signal: controller.signal },
        )
        if (!path) {
          setPackageContents([])
          return
        }

        const contents = await fetchFsLs({
          path,
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          setNodeResolvedPath(path)
          setPackageContents(contents)
          setBreadcrumbs([])
        }
      } catch (e: unknown) {
        if (isAbortError(e, controller.signal)) return
        if (e instanceof Error) {
          setErrors(prev => [
            ...(prev ?? []),
            { origin: 'Code explorer', cause: e.message },
          ])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      controller.abort()
    }
  }, [depId]) // eslint-disable react-hooks/exhaustive-deps

  // Hydrate state from initialRelPath (URL splat) once root is available
  useEffect(() => {
    if (!nodeResolvedPath) return
    const rel = normalizeRelPath(initialRelPath)
    if (!rel) return
    if (hasHydratedRef.current === rel) return
    if (!packageContents) return
    if (breadcrumbs.length > 0 || selectedPackageContentItem) return

    const controller = new AbortController()
    void (async () => {
      try {
        let currentContents = packageContents
        const parts = rel.split('/')
        const crumbs: { name: string; path: string }[] = []

        for (const [i, part] of parts.entries()) {
          const nextItem = findChildByName(currentContents, part)
          if (!nextItem) break
          const isLast = i === parts.length - 1

          if (!isLast) {
            if (
              nextItem.type === 'directory' ||
              nextItem.type === 'symlink'
            ) {
              const next = await listDirectory(
                nextItem.path,
                controller.signal,
              )
              if (controller.signal.aborted) return
              currentContents = next
              crumbs.push({ name: part, path: nextItem.path })
              continue
            }
            break
          }

          if (nextItem.type === 'file') {
            await updateToFile(
              nextItem.path,
              { setSelectedPackageContentItem },
              controller.signal,
            )
            if (controller.signal.aborted) return
            setBreadcrumbs(crumbs)
            setPackageContents(currentContents)
          } else if (
            nextItem.type === 'directory' ||
            nextItem.type === 'symlink'
          ) {
            await updateToDirectory(
              nextItem.path,
              nodeResolvedPath,
              {
                setPackageContents,
                setBreadcrumbs,
                setSelectedPackageContentItem,
              },
              controller.signal,
            )
          }
        }

        hasHydratedRef.current = rel
      } catch (e) {
        if (isAbortError(e, controller.signal)) return
        if (e instanceof Error) {
          setErrors(prev => [
            ...(prev ?? []),
            { origin: 'Hydrate code path', cause: e.message },
          ])
        }
      }
    })()

    return () => controller.abort()
  }, [
    nodeResolvedPath,
    packageContents,
    initialRelPath,
    breadcrumbs.length,
    selectedPackageContentItem,
  ]) // eslint-disable react-hooks/exhaustive-deps

  const onPackageContentItemClick = useCallback(
    (item: FsItem) => {
      const controller = new AbortController()
      if (item.type === 'file') {
        void (async () => {
          try {
            const read = await readFileContent(
              item.path,
              controller.signal,
            )
            if (controller.signal.aborted) return
            setSelectedPackageContentItem(read)
          } catch (e) {
            if (isAbortError(e, controller.signal)) return
            if (e instanceof Error) {
              setErrors(prev => [
                ...(prev ?? []),
                { origin: 'Read file', cause: e.message },
              ])
            }
          }
        })()
        return
      }
      if (item.type === 'symlink') {
        void (async () => {
          try {
            await updateToDirectory(
              item.path,
              nodeResolvedPath,
              {
                setPackageContents,
                setBreadcrumbs,
                setSelectedPackageContentItem,
              },
              controller.signal,
            )
          } catch (e) {
            if (isAbortError(e, controller.signal)) return
            // If listing failed, try reading as a file target
            try {
              const read = await readFileContent(
                item.path,
                controller.signal,
              )
              setSelectedPackageContentItem(read)
            } catch (e2) {
              if (isAbortError(e2, controller.signal)) return
              if (e2 instanceof Error) {
                setErrors(prev => [
                  ...(prev ?? []),
                  { origin: 'Open symlink', cause: e2.message },
                ])
              }
            }
          }
        })()
        return
      }
      if (item.type === 'directory') {
        void (async () => {
          try {
            await updateToDirectory(
              item.path,
              nodeResolvedPath,
              {
                setPackageContents,
                setBreadcrumbs,
                setSelectedPackageContentItem,
              },
              controller.signal,
            )
          } catch (e) {
            if (isAbortError(e, controller.signal)) return
            if (e instanceof Error) {
              setErrors(prev => [
                ...(prev ?? []),
                { origin: 'Open directory', cause: e.message },
              ])
            }
          }
        })()
        return
      }
    },
    [nodeResolvedPath],
  )

  const onRootClick = useCallback(() => {
    if (!nodeResolvedPath) {
      setBreadcrumbs([])
      setSelectedPackageContentItem(null)
      return
    }
    const controller = new AbortController()
    void (async () => {
      try {
        await updateToDirectory(
          nodeResolvedPath,
          nodeResolvedPath,
          {
            setPackageContents,
            setBreadcrumbs,
            setSelectedPackageContentItem,
          },
          controller.signal,
        )
      } catch (e) {
        if (isAbortError(e, controller.signal)) return
        if (e instanceof Error) {
          setErrors(prev => [
            ...(prev ?? []),
            { origin: 'Go to root', cause: e.message },
          ])
        }
      }
    })()
  }, [nodeResolvedPath])

  const onCrumbClick = useCallback(
    (crumbPath: string) => {
      const controller = new AbortController()
      void (async () => {
        try {
          await updateToDirectory(
            crumbPath,
            nodeResolvedPath,
            {
              setPackageContents,
              setBreadcrumbs,
              setSelectedPackageContentItem,
            },
            controller.signal,
          )
        } catch (e) {
          if (isAbortError(e, controller.signal)) return
          if (e instanceof Error) {
            setErrors(prev => [
              ...(prev ?? []),
              { origin: 'Navigate breadcrumb', cause: e.message },
            ])
          }
        }
      })()
    },
    [nodeResolvedPath],
  )

  return useMemo(
    () => ({
      loading,
      errors,
      packageContents,
      nodeResolvedPath,
      selectedPackageContentItem,
      setSelectedPackageContentItem,
      breadcrumbs,
      setBreadcrumbs,
      onPackageContentItemClick,
      onRootClick,
      onCrumbClick,
    }),
    [
      loading,
      errors,
      packageContents,
      nodeResolvedPath,
      selectedPackageContentItem,
      breadcrumbs,
      onPackageContentItemClick,
      onRootClick,
      onCrumbClick,
    ],
  )
}
