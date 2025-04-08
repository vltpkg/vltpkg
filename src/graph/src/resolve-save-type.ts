import type {
  DependencySaveType,
  DependencyTypeShort,
} from '@vltpkg/types'
import type { NodeLike } from './types.ts'

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
