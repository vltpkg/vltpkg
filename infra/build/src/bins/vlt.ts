if (process.env.__VLT_INTERNAL_MAIN) {
  await import(process.env.__VLT_INTERNAL_MAIN)
} else {
  const vlt = await import('@vltpkg/cli-sdk')
  await vlt.default()
}
