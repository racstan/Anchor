export interface SecuritySettings {
  pinHash?: string
}

export const SECURITY_STORAGE_KEY = 'anchor-security-v1'

export function readSecuritySettings(): SecuritySettings {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const saved = window.localStorage.getItem(SECURITY_STORAGE_KEY)

    if (!saved) {
      return {}
    }

    const parsed = JSON.parse(saved) as { pinHash?: unknown }

    return typeof parsed.pinHash === 'string' && /^[a-f0-9]{64}$/i.test(parsed.pinHash)
      ? { pinHash: parsed.pinHash }
      : {}
  } catch {
    return {}
  }
}

export function writeSecuritySettings(settings: SecuritySettings): void {
  if (typeof window === 'undefined') {
    return
  }

  if (settings.pinHash) {
    window.localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify({ pinHash: settings.pinHash }))
  } else {
    window.localStorage.removeItem(SECURITY_STORAGE_KEY)
  }
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) {
    throw new Error('A device PIN must be 4 to 6 digits.')
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('This device does not support secure PIN storage.')
  }

  const encodedPin = new TextEncoder().encode(pin)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encodedPin)

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  if (!isValidPin(pin)) {
    return false
  }

  return (await hashPin(pin)) === expectedHash.toLowerCase()
}
