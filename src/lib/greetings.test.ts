import { describe, expect, it } from 'vitest'
import { getDailyGreeting, SUBTITLE_POOL } from './greetings'

describe('greetings module', () => {
  it('generates a personalized greeting containing the user name', () => {
    const greeting = getDailyGreeting('Alex')
    expect(greeting.title).toContain('Alex')
    expect(greeting.subtitle.length).toBeGreaterThan(10)
  })

  it('handles empty or whitespace-only names gracefully', () => {
    const greeting = getDailyGreeting('   ')
    expect(greeting.title).toContain('friend')
    expect(greeting.subtitle.length).toBeGreaterThan(10)
  })

  it('contains over 80 unique subtitles in the pool', () => {
    expect(SUBTITLE_POOL.length).toBeGreaterThanOrEqual(80)
  })

  it('produces diverse titles across multiple calls', () => {
    const samples = new Set<string>()
    for (let i = 0; i < 50; i++) {
      samples.add(getDailyGreeting('D').title)
    }
    // Should have substantial variety
    expect(samples.size).toBeGreaterThanOrEqual(5)
  })
})
