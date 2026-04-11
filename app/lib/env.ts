export function getEnv(name: string): string {
  // FIX: Access `window.__RUNTIME_CONFIG__` safely due to global augmentation in `types.ts`
  if (typeof window !== 'undefined' && typeof window.__RUNTIME_CONFIG__ !== 'undefined' && window.__RUNTIME_CONFIG__[name] !== undefined) {
    const v = window.__RUNTIME_CONFIG__[name]
    if (v === undefined || v === null || v === '') {
      throw new Error(`Environment variable "${name}" is not set in __RUNTIME_CONFIG__. Please ensure it's defined in index.html.`)
    }
    return String(v)
  }

  const v = (process.env as any)?.[name]
  if (v === undefined || v === null || v === '') {
    throw new Error(`Environment variable "${name}" is not set in your build environment. Please ensure it's defined in your .env.local file (or equivalent).`)
  }
  return String(v)
}