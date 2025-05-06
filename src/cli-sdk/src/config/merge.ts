type MergeableObject = Record<string, unknown>
type MergeableArray = unknown[]

/*
 * deep merge 2 objects
 * scalars are overwritten, objects are folded in together
 * if nothing to be added, then return the base object.
 */
export const merge = <T extends MergeableObject>(
  base: T,
  add: T,
): T =>
  Object.fromEntries(
    Object.entries(base)
      .map(([k, v]): [string, unknown] => [
        k,
        add[k] === undefined ? v
        : Array.isArray(v) && Array.isArray(add[k]) ?
          [
            ...new Set([
              ...(v as MergeableArray),
              ...(add[k] as MergeableArray),
            ]),
          ]
        : Array.isArray(v) || Array.isArray(add[k]) ? add[k]
        : (
          !!v &&
          typeof v === 'object' &&
          !!add[k] &&
          typeof add[k] === 'object'
        ) ?
          merge(v as MergeableObject, add[k] as MergeableObject)
        : add[k],
      ])
      .concat(
        // already merged together if existing, so just get new additions
        Object.entries(add).filter(([k]) => base[k] === undefined),
      ),
  ) as T
