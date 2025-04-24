import { stat } from 'node:fs/promises'

export const dirExists = async (path: string): Promise<boolean> =>
  stat(path).then(
    st => st.isDirectory(),
    () => false,
  )
