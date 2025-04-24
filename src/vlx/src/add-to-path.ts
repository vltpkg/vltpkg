import { delimiter } from 'node:path'

export const addToPATH = (newPath: string) => {
  process.env.PATH = [
    ...new Set(
      `${newPath}${delimiter}${process.env.PATH ?? ''}`.split(
        delimiter,
      ),
    ),
  ]
    .filter(p => !!p)
    .join(delimiter)
}
