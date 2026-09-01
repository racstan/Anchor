import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, verifyPin } from './security'

describe('device PINs', () => {
  it('accepts only four to six digits', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12ab')).toBe(false)
  })

  it('stores a digest and verifies the original PIN', async () => {
    const digest = await hashPin('4821')

    expect(digest).toHaveLength(64)
    expect(digest).not.toBe('4821')
    expect(await verifyPin('4821', digest)).toBe(true)
    expect(await verifyPin('4822', digest)).toBe(false)
  })
})
