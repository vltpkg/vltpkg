/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// deep merge 2 objects
// scalars are overwritten, objects are folded in together
// if nothing to be added, then return the base object.
export const merge = <T extends Record<string, any>>(
  base: T,
  add: T,
): T =>
  Object.fromEntries(
    Object.entries(base)
      .map(([k, v]) => [
        k,
        add[k] === undefined ? v
        : Array.isArray(v) && Array.isArray(add[k]) ?
          [...new Set([...v, ...add[k]])]
        : Array.isArray(v) || Array.isArray(add[k]) ? add[k]
        : (
          !!v &&
          typeof v === 'object' &&
          !!add[k] &&
          typeof add[k] === 'object'
        ) ?
          merge(v, add[k])
        : add[k],
      ])
      .concat(
        // already merged together if existing, so just get new additions
        Object.entries(add).filter(([k]) => base[k] === undefined),
      ),
  ) as T
