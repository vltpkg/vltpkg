import { DOMAIN } from '../../config.ts'

export const getApp = async (): Promise<string> => {
  const app = await fetch(`${DOMAIN}/public/dist/index.html`)
  return changeSourceReferences(await app.text())
}

export const changeSourceReferences = (html: string): string => {
  html = html.replace('href="/main.css', 'href="/public/dist/main.css')
  html = html.replace('href="/favicon.ico"', 'href="/public/dist/favicon.ico"')
  html = html.replace('href="/fonts/', 'href="/public/dist/fonts/')
  html = html.replace('src="/index.js"', 'src="/public/dist/index.js"')
  return html
}
