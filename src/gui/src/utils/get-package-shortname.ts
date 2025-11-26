/**
 * Gets a 'short name' of the package and takes into consideration
 * if the value is a scope or not. Extracts first 2 letters, skipping
 * numbers and special characters.
 *
 * Examples:
 * - react -> re
 * - @facebook/react -> re
 * - _private -> pr
 * - @scope/-package -> pa
 * - 123-test -> te
 * - @org/__internal -> in
 */
export const getPackageShortName = (value: string) => {
  // Get the package name (after scope if scoped)
  const packageName =
    value.startsWith('@') ? value.split('/')[1] || '' : value

  // Extract only letters (no numbers or special characters)
  const letters = packageName.replace(/[^a-zA-Z]/g, '')

  // Return first 2 letters, or fall back to first 2 chars of package name
  return letters.substring(0, 2) || packageName.substring(0, 2)
}
