import { splitDepID } from '@vltpkg/dep-id'
import { addKey, asDependency } from '@vltpkg/graph'
import { parse } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import {
  isErrorWithCause,
  isObject,
  longDependencyTypes,
} from '@vltpkg/types'
import { resolve } from 'node:path'
import type { AddImportersDependenciesMap } from '@vltpkg/graph'
import type { DependencyTypeLong, Manifest } from '@vltpkg/types'
import type { LoadedConfig } from './config/index.ts'

type TypedManifest = Pick<Manifest, 'exports'> & {
  types?: unknown
  typings?: unknown
  typesVersions?: unknown
}

/** `foo` → `@types/foo`, `@scope/foo` → `@types/scope__foo` */
export const typesName = (name: string): string =>
  `@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`

const exportsHaveTypes = (e: unknown): boolean =>
  !!e &&
  typeof e === 'object' &&
  Object.entries(e).some(
    ([k, v]) =>
      k === 'types' || k.startsWith('types@') || exportsHaveTypes(v),
  )

// root entry only: typed subpaths don't type `import 'pkg'`
const rootExport = (e: unknown): unknown =>
  isObject(e) && Object.keys(e).some(k => k.startsWith('.')) ?
    e['.']
  : e

/** Does the manifest declare its own TypeScript types? */
export const hasOwnTypes = (m: TypedManifest): boolean =>
  !!(m.types || m.typings || m.typesVersions) ||
  exportsHaveTypes(rootExport(m.exports))

const isResolveError = (er: unknown): boolean =>
  isErrorWithCause(er) &&
  isObject(er.cause) &&
  er.cause.code === 'ERESOLVE'

/**
 * For each added registry package that ships no types, add the newest
 * non-deprecated `@types/*` package in the same major (major.minor for
 * 0.x), else its older-major `latest`, to that importer's
 * devDependencies.
 */
export const addTypesDeps = async (
  conf: LoadedConfig,
  add: AddImportersDependenciesMap,
): Promise<void> => {
  const { options } = conf
  const { packageInfo, packageJson, projectRoot } = options
  const exact = conf.values['save-exact']
  const prefix = conf.values['save-prefix']
  const lookups = new Map<string, Promise<Spec | undefined>>()

  const lookup = async (
    spec: Spec,
    name: string,
  ): Promise<Spec | undefined> => {
    const types = (range: string) =>
      packageInfo.manifest(Spec.parse(name, range, options))
    try {
      const m = await packageInfo.manifest(spec)
      const { version = '' } = m
      const v = parse(version)
      if (!v || hasOwnTypes(m)) return
      let tm: Pick<Manifest, 'version' | 'deprecated'>
      try {
        // @types track lib major (major.minor for 0.x); x-range, `^0`
        // would only match 0.0.0
        tm = await types(v.major ? String(v.major) : `0.${v.minor}`)
      } catch (er) {
        if (!isResolveError(er)) throw er
        // @types often lag lib majors: take `latest` if older
        tm = await types('latest')
        if (!parse(tm.version ?? '')?.lessThan(v)) return
      }
      if (!tm.version || tm.deprecated) return
      // abbreviated packuments omit types fields: recheck on full one
      const { versions } = await packageInfo.packument(spec, {
        full: true,
      })
      if (hasOwnTypes({ ...versions[version] })) return
      return Spec.parse(
        name,
        exact ? tm.version : `${prefix}${tm.version}`,
        options,
      )
    } catch (er) {
      if (isResolveError(er)) return
      throw er
    }
  }

  await Promise.all(
    [...add].map(async ([importer, deps]) => {
      const mani: Pick<Manifest, DependencyTypeLong> =
        packageJson.maybeRead(
          resolve(projectRoot, splitDepID(importer)[1]),
        ) ?? {}
      const found = await Promise.all(
        [...deps.values()].map(async ({ spec }) => {
          const { final } = spec
          const name = typesName(spec.name)
          if (
            final.type !== 'registry' ||
            final.name !== spec.name ||
            spec.name.startsWith('@types/') ||
            deps.has(name) ||
            [...longDependencyTypes].some(
              t => mani[t]?.[name] !== undefined,
            ) ||
            // other registry: its @types/<name> is a different pkg
            final.registry !==
              Spec.parse(name, '', options).final.registry
          ) {
            return
          }
          const key = String(spec)
          let p = lookups.get(key)
          if (!p) lookups.set(key, (p = lookup(spec, name)))
          return p
        }),
      )
      const types = found.filter(s => s !== undefined)
      if (!types.length) return
      // fresh Map: importers may share one deps Map
      add.set(
        importer,
        new Map([
          ...deps,
          ...types.map(
            spec =>
              [
                addKey(spec),
                asDependency({ spec, type: 'dev' }),
              ] as const,
          ),
        ]),
      )
    }),
  )
}
