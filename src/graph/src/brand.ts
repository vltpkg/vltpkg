/**
 * `Symbol.toStringTag` placement that survives compilation.
 *
 * A getter reads back `undefined` in the compiled binary (perry-notes F6),
 * which silently breaks every brand check that reads it, and a prototype
 * property — defined or assigned — is not read either. A plain class field
 * does read, but it is own and enumerable, so `util.inspect` lists it as a
 * property instead of using it as the tag prefix, changing Node's output.
 *
 * An own, non-enumerable property is the only placement that reads
 * correctly compiled AND leaves Node's inspect output untouched.
 *
 * Evidence: `scripts/perry/probes/tostringtag/run.sh`.
 */
export const brand = <T extends object>(obj: T, tag: string): T =>
  Object.defineProperty(obj, Symbol.toStringTag, {
    value: tag,
    enumerable: false,
    writable: false,
    configurable: true,
  })
