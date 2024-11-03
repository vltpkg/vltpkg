import { splitDepID } from '@vltpkg/dep-id/browser'
import { type NodeLike } from './types.js'

export const stringifyNode = (node?: NodeLike) => {
  if (!node) return ''
  const version = node.version ? `@${node.version}` : ''
  const [type, ref, nameVersion] = splitDepID(node.id)

  if (type === 'registry') {
    const prefix = ref ? `${ref}:` : 'npm:'
    return `${prefix}${nameVersion}`
  } else if (type === 'workspace') {
    return `workspace:${node.name}`
  } else if (type === 'file' && node.mainImporter) {
    return `root:${node.name}`
  } else {
    // node.name getter will return the id if the package has no name
    // property so here we check for that in order to return `type(ref)` only
    const nameVersion =
      node.name !== node.id ? `:${node.name}${version}` : ''
    return `${type}(${ref})${nameVersion}`
  }
}
