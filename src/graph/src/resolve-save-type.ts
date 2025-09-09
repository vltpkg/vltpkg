import type {
  DependencySaveType,
  DependencyTypeShort,
  NodeLike,
} from '@vltpkg/types'

/**
 * Resolve a {@link DependencySaveType} to a {@link DependencyTypeShort}
 */
export const resolveSaveType = (
  node: NodeLike,
  name: string,
  saveType: DependencySaveType,
): DependencyTypeShort =>
  saveType !== 'implicit' ? saveType : (
    (node.edgesOut.get(name)?.type ?? 'prod')
  )
