// usually this will be 'package/', but could also be anything
// eg, github tarballs are ${user}-${project}-${committish}
// if it starts with `./` then all entries must as well.
export const findTarDir = (
  path: string | undefined,
  tarDir?: string,
) => {
  if (tarDir !== undefined) return tarDir
  if (!path) return undefined
  const i = path.indexOf('/', path.startsWith('./') ? 2 : 0)
  if (i === -1) return undefined
  const chomp = path.substring(0, i)
  if (
    chomp === '.' ||
    chomp === '..' ||
    chomp === '' ||
    chomp === './.' ||
    chomp === './..' ||
    chomp === './'
  ) {
    return undefined
  }
  return chomp + '/'
}
