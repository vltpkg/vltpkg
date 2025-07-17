export const getSiteName = (url: string): string | undefined => {
  return new URL(url).hostname.replace(/^www\./, '').split('.')[0]
}
