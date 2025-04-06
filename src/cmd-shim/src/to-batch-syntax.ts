export const convertToSetCommand = (key: string, value: string) =>
  convertToSetCommand_(key.trim(), value.trim())

const convertToSetCommand_ = (key: string, value: string) =>
  key && value ?
    `@SET ${key}=${replaceDollarWithPercentPair(value)}\r\n`
  : ''

const extractVariableValuePairs = (declarations: string[]) =>
  declarations.reduce(
    (pairs: Record<string, string>, declaration) => {
      const [key = '', val = ''] = declaration.split('=')
      pairs[key] = val
      return pairs
    },
    {},
  )

export const convertToSetCommands = (variableString: string) =>
  Object.entries(extractVariableValuePairs(variableString.split(' ')))
    .map(([key, val]) => convertToSetCommand(key, val))
    .join('')

export const replaceDollarWithPercentPair = (value: string) => {
  const dollarExpressions = /\$\{?([^$@#?\- \t{}:]+)\}?/g
  let result = ''
  let startIndex = 0
  do {
    const match = dollarExpressions.exec(value)
    if (match) {
      const betweenMatches =
        value.substring(startIndex, match.index) || ''
      result += betweenMatches + '%' + String(match[1]) + '%'
      startIndex = dollarExpressions.lastIndex
    }
  } while (dollarExpressions.lastIndex > 0)
  result += value.slice(startIndex)
  return result
}
