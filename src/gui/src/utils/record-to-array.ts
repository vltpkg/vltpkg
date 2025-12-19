export const recordToArray = <
  TKeyProp extends string,
  TValueProp extends string,
>(
  input: Record<string, string> | undefined,
  keyProp: TKeyProp,
  valueProp: TValueProp,
):
  | (Record<TKeyProp, string> & Record<TValueProp, string>)[]
  | undefined => {
  if (!input) return undefined

  return Object.entries(input).map(([key, value]) => ({
    [keyProp]: key,
    [valueProp]: value,
  })) as (Record<TKeyProp, string> & Record<TValueProp, string>)[]
}
