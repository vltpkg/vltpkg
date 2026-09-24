export const getWordCount = (val: string): number =>
  val
    .replace(/---[\s\S]*?---/, '')
    .trim()
    .split(/\s+/).length
