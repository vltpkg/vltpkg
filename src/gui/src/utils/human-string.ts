/**
 * The option object for the `toHumanString` helper.
 */
export type ToHumanStringOptions = {
  /**
   * How many items can be counted in the default `value` string.
   * This value is used to define what string variation should be used.
   */
  count?: number
  /**
   * A string variation to be used when `count` is `0`.
   */
  zero?: string
  /**
   * The default string variation to be used when `count` is greater than `1`
   * or also used when the specific count variation can't be found.
   */
  value: string
  /**
   * A string variation to be used when `count` is `1`.
   */
  one?: string
}

/**
 * Helper to provide pluralization and zero variants to given strings.
 */
export function toHumanString(options: ToHumanStringOptions): string {
  const { count = 1, zero, value, one } = options

  if (count === 0) {
    return zero ?? value
  }

  if (count === 1) {
    return one ?? value
  }

  return value
}
