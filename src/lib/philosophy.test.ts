import { describe, expect, it } from 'vitest'
import {
  CORE_PHILOSOPHY_THOUGHTS,
  generateSynthesizedWisdom,
  getCachedPhilosophyVault,
  getDailyPhilosophy,
  getRandomPhilosophy,
  downloadAndExpandPhilosophyVault,
} from './philosophy'

describe('philosophy module', () => {
  it('loads core philosophy thoughts', () => {
    expect(CORE_PHILOSOPHY_THOUGHTS.length).toBeGreaterThan(20)
    const marcus = CORE_PHILOSOPHY_THOUGHTS.find((t) => t.author.includes('Marcus Aurelius'))
    expect(marcus).toBeDefined()
    expect(marcus?.category).toBe('calm-stoicism')
  })

  it('generates thousands of synthesized philosophies', () => {
    const batch = generateSynthesizedWisdom(500)
    expect(batch).toHaveLength(500)
    expect(batch[0].quote).toBeDefined()
    expect(batch[0].category).toBeDefined()
  })

  it('provides deterministic daily philosophy and random selections', () => {
    const daily1 = getDailyPhilosophy(new Date('2026-09-01'))
    const daily2 = getDailyPhilosophy(new Date('2026-09-01'))
    expect(daily1.id).toBe(daily2.id)

    const random1 = getRandomPhilosophy('calm-stoicism')
    expect(random1).toBeDefined()
  })

  it('downloads and expands the philosophy vault', async () => {
    const res = await downloadAndExpandPhilosophyVault(200)
    expect(res.total).toBeGreaterThanOrEqual(200)
    const cached = getCachedPhilosophyVault()
    expect(cached.length).toBe(res.total)
  })
})
