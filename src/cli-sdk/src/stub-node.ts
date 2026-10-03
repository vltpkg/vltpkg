import { getId } from '@vltpkg/dep-id'
import type { Spec, SpecOptions } from '@vltpkg/spec'
import type { NodeLike } from '@vltpkg/types'

/**
 * Create a minimal NodeLike for a package version that is not part of
 * any graph, so that it can be looked up in the security archive.
 * Only the fields used by `SecurityArchive.start()` are needed.
 */
export const createStubNode = (
  spec: Spec,
  name: string,
  version: string,
  options: SpecOptions,
): NodeLike =>
  ({
    id: getId(spec, { name, version }),
    name,
    version,
    confused: false,
    edgesIn: new Set(),
    edgesOut: new Map(),
    workspaces: undefined,
    importer: false,
    mainImporter: false,
    projectRoot: '',
    dev: false,
    optional: false,
    graph: {} as NodeLike['graph'],
    options,
    /* c8 ignore next 5 - stub methods for NodeLike interface */
    toJSON: () => ({}),
    toString: () => `${name}@${version}`,
    setResolved: () => {},
    setConfusedManifest: () => {},
    maybeSetConfusedManifest: () => {},
  }) as unknown as NodeLike
