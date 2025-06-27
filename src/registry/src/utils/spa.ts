// This function now takes the ASSETS environment binding as a parameter
// to avoid the circular dependency issue
export const getApp = async (
  assetsBinding?: any,
): Promise<string> => {
  if (assetsBinding) {
    try {
      // Use the ASSETS binding to fetch the index.html file
      const response = await assetsBinding.fetch(
        new Request('http://localhost/public/dist/index.html'),
      )
      if (response.ok) {
        const html = await response.text()
        return changeSourceReferences(html)
      }
    } catch (error) {
      console.error('Failed to load index.html from assets:', error)
    }
  }

  // Fallback: provide a simple HTML page
  return `<!DOCTYPE html>
<html>
<head>
  <title>VLT Serverless Registry</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/public/images/favicon/favicon.ico" type="image/x-icon">
</head>
<body>
  <h1>VLT Serverless Registry</h1>
  <p>Registry is running but the UI is not available.</p>
  <p>Try accessing <a href="/public/dist/index.html">/public/dist/index.html</a> directly.</p>
</body>
</html>`
}

export const changeSourceReferences = (html: string): string => {
  html = html.replace(
    'href="/main.css',
    'href="/public/dist/main.css',
  )
  html = html.replace(
    'href="/favicon.ico"',
    'href="/public/dist/favicon.ico"',
  )
  html = html.replace('href="/fonts/', 'href="/public/dist/fonts/')
  html = html.replace(
    'src="/index.js"',
    'src="/public/dist/index.js"',
  )
  return html
}
