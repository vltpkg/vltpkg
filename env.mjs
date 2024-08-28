const serdes = async () => {
  const proc = await import('node:process')
  const isNode = typeof proc?.versions === 'object' && !!proc.versions
  const isDeno = !isNode && typeof Deno === 'object' && !!Deno
  const isBun = !isNode && !isDeno && typeof Bun === 'object' && !!Bun

  const engineVersion =
    isNode ? proc.versions.v8
    : isDeno ? Deno.version.v8
    : isBun ? Bun.version
    : undefined

  const engineName =
    isNode || isDeno ? 'v8'
    : isBun ? 'bun'
    : undefined

  const engineMajor = parseInt(
    engineVersion?.replace(/[^0-9]/g, ' ').trim() ?? '',
    10,
  )

  const serializedHeader =
    engineName && engineMajor ?
      `${engineName}-serialize-${engineMajor}`
    : undefined

  return {
    isNode,
    isDeno,
    isBun,
    engineVersion,
    engineName,
    serializedHeader,
  }
}

const userAgent = async () => {
  const bun = (await import('bun').catch(() => {}))?.default?.version
  const deno = globalThis.Deno?.deno?.version
  const node = globalThis.process?.version
  const nua =
    bun ? `Bun/${bun}`
    : deno ? `Deno/${deno}`
    : node ? `Node.js/${node}`
    : '(unknown platform)'

  return {
    bun,
    deno,
    node,
    nua,
  }
}

console.log(await serdes())
console.log(await userAgent())
