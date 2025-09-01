// This function now takes the ASSETS environment binding as a parameter
// to avoid the circular dependency issue
export const getApp = async (
  assetsBinding?: any,
): Promise<string> => {
  if (assetsBinding) {
    try {
      // Use the ASSETS binding to fetch the index.html file
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const response = (await assetsBinding.fetch(
        new Request('http://localhost/public/index.html'),
      )) as Response
      if (response.ok) {
        const html = await response.text()
        return changeSourceReferences(html)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load index.html from assets:', error)
    }
  }

  // Fallback: provide a simple HTML page
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>vlt | Explorer</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; text-align: center; }
    .error { color: #dc2626; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>vlt | Explorer</h1>
  <div class="error">Unable to load the application assets.</div>
  <p>Please check that the server is running correctly and assets are available.</p>
</body>
</html>`
}

export const changeSourceReferences = (html: string): string => {
  html = html.replace('href="/main.css', 'href="/public/main.css')
  html = html.replace(
    'href="/favicon.ico"',
    'href="/public/favicon.ico"',
  )
  html = html.replace('href="/fonts/', 'href="/public/fonts/')
  html = html.replace('src="/index.js"', 'src="/public/index.js"')
  return html
}
