export const isRecord = <T = string>(
  val: unknown,
): val is Record<string, T> => {
  return (
    typeof val === 'object' && val !== null && !Array.isArray(val)
  )
}
