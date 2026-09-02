import { describe, expect, it } from 'vitest'
import {
  getNativeReminderPatterns,
  getNextReminderDate,
  normalizeNotificationSettings,
  notificationsHaveReminder,
} from './notifications'

const baseSettings = normalizeNotificationSettings({
  enabled: true,
  anchorReminders: true,
  thoughtReminders: false,
  frequency: 'daily',
  time: '09:30',
})

describe('notification settings', () => {
  it('normalizes invalid schedules to safe defaults', () => {
    const settings = normalizeNotificationSettings({
      enabled: true,
      frequency: 'not-a-frequency' as never,
      time: '32:90',
      weekday: 9,
    })

    expect(settings.frequency).toBe('daily')
    expect(settings.time).toBe('09:00')
    expect(settings.weekday).toBe(1)
  })

  it('finds the next daily reminder at the configured local time', () => {
    const now = new Date(2026, 0, 5, 8, 15, 20)
    const next = getNextReminderDate(baseSettings, now)

    expect(next?.getFullYear()).toBe(2026)
    expect(next?.getDate()).toBe(5)
    expect(next?.getHours()).toBe(9)
    expect(next?.getMinutes()).toBe(30)
  })

  it('skips weekends for weekday reminders', () => {
    const settings = normalizeNotificationSettings({ ...baseSettings, frequency: 'weekdays', time: '09:00' })
    const fridayEvening = new Date(2026, 0, 9, 18, 0, 0)
    const next = getNextReminderDate(settings, fridayEvening)

    expect(next?.getDay()).toBe(1)
    expect(next?.getDate()).toBe(12)
  })

  it('creates one native pattern per weekday', () => {
    const settings = normalizeNotificationSettings({ ...baseSettings, frequency: 'weekdays' })
    const patterns = getNativeReminderPatterns(settings)

    expect(patterns).toHaveLength(5)
    expect(patterns.map((pattern) => pattern.weekday)).toEqual([2, 3, 4, 5, 6])
  })

  it('does not schedule reminders when the user turns them off', () => {
    expect(notificationsHaveReminder({ ...baseSettings, enabled: false })).toBe(false)
    expect(notificationsHaveReminder({ ...baseSettings, frequency: 'off' })).toBe(false)
    expect(notificationsHaveReminder({ ...baseSettings, anchorReminders: false, thoughtReminders: false })).toBe(false)
  })
})
