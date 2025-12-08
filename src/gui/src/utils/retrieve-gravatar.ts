export const retrieveGravatar = async (
  email: string,
): Promise<string> => {
  const cleaned = email.trim().toLowerCase()
  const encoder = new TextEncoder()
  const data = encoder.encode(cleaned)
  const compute = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(compute))
  const hash = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `https://gravatar.com/avatar/${hash}?d=retro`
}
