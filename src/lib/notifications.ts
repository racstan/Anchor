import { getAppPlatform, isNativeApp } from './updater'

export type NotificationFrequency = 'off' | 'hourly' | 'daily' | 'weekdays' | 'weekly'

export interface NotificationSettings {
  enabled: boolean
  aiResponses: boolean
  anchorReminders: boolean
  thoughtReminders: boolean
  frequency: NotificationFrequency
  time: string
  weekday: number
}

export interface NotificationContent {
  title: string
  body: string
}

export const NOTIFICATION_SETTINGS_STORAGE_KEY = 'anchor-notification-settings-v1'

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  aiResponses: true,
  anchorReminders: true,
  thoughtReminders: false,
  frequency: 'daily',
  time: '09:00',
  weekday: 1,
}

// These are reserved for Anchor's scheduled reminders. Immediate AI notices
// intentionally do not use a fixed ID so the OS can show each response.
const NATIVE_REMINDER_IDS = [48101, 48102, 48103, 48104, 48105]

function isFrequency(value: unknown): value is NotificationFrequency {
  return value === 'off' || value === 'hourly' || value === 'daily' || value === 'weekdays' || value === 'weekly'
}

function normalizeTime(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_NOTIFICATION_SETTINGS.time

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return DEFAULT_NOTIFICATION_SETTINGS.time

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return DEFAULT_NOTIFICATION_SETTINGS.time
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function normalizeNotificationSettings(value: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  const settings = value ?? {}
  const weekday = typeof settings.weekday === 'number' && Number.isInteger(settings.weekday) && settings.weekday >= 1 && settings.weekday <= 7
    ? settings.weekday
    : DEFAULT_NOTIFICATION_SETTINGS.weekday

  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_NOTIFICATION_SETTINGS.enabled,
    aiResponses: typeof settings.aiResponses === 'boolean' ? settings.aiResponses : DEFAULT_NOTIFICATION_SETTINGS.aiResponses,
    anchorReminders: typeof settings.anchorReminders === 'boolean' ? settings.anchorReminders : DEFAULT_NOTIFICATION_SETTINGS.anchorReminders,
    thoughtReminders: typeof settings.thoughtReminders === 'boolean' ? settings.thoughtReminders : DEFAULT_NOTIFICATION_SETTINGS.thoughtReminders,
    frequency: isFrequency(settings.frequency) ? settings.frequency : DEFAULT_NOTIFICATION_SETTINGS.frequency,
    time: normalizeTime(settings.time),
    weekday,
  }
}

export function readNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_NOTIFICATION_SETTINGS }

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS }
    return normalizeNotificationSettings(JSON.parse(raw) as Partial<NotificationSettings>)
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS }
  }
}

export function writeNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeNotificationSettings(settings)))
  } catch {
    // Persistence is optional when storage is unavailable.
  }
}

export function notificationsHaveReminder(settings: NotificationSettings): boolean {
  return settings.enabled && settings.frequency !== 'off' && (settings.anchorReminders || settings.thoughtReminders)
}

function getTimeParts(time: string): { hour: number; minute: number } {
  const [hour, minute] = normalizeTime(time).split(':').map(Number)
  return { hour, minute }
}

function isAllowedDay(date: Date, settings: NotificationSettings): boolean {
  if (settings.frequency === 'weekdays') {
    const day = date.getDay()
    return day >= 1 && day <= 5
  }
  if (settings.frequency === 'weekly') {
    const sundayBasedDay = date.getDay() + 1
    return sundayBasedDay === settings.weekday
  }
  return true
}

/** Returns the next local time at which a browser timer should fire. */
export function getNextReminderDate(settings: NotificationSettings, now = new Date()): Date | null {
  if (!notificationsHaveReminder(settings)) return null

  const { hour, minute } = getTimeParts(settings.time)
  const candidate = new Date(now)
  candidate.setSeconds(0, 0)

  if (settings.frequency === 'hourly') {
    candidate.setMinutes(minute, 0, 0)
    if (candidate.getTime() <= now.getTime()) candidate.setHours(candidate.getHours() + 1)
    return candidate
  }

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() + dayOffset)
    date.setHours(hour, minute, 0, 0)

    if (!isAllowedDay(date, settings)) continue
    if (date.getTime() <= now.getTime()) continue
    return date
  }

  return null
}

export interface NativeReminderPattern {
  id: number
  hour?: number
  minute?: number
  weekday?: number
}

/** Creates calendar patterns understood by the Tauri notification plugin. */
export function getNativeReminderPatterns(settings: NotificationSettings): NativeReminderPattern[] {
  if (!notificationsHaveReminder(settings)) return []

  const { hour, minute } = getTimeParts(settings.time)
  if (settings.frequency === 'hourly') {
    return [{ id: NATIVE_REMINDER_IDS[0], minute }]
  }
  if (settings.frequency === 'weekly') {
    return [{ id: NATIVE_REMINDER_IDS[0], weekday: settings.weekday, hour, minute }]
  }
  if (settings.frequency === 'weekdays') {
    return [1, 2, 3, 4, 5].map((weekday, index) => ({
      id: NATIVE_REMINDER_IDS[index],
      weekday: weekday + 1,
      hour,
      minute,
    }))
  }
  return [{ id: NATIVE_REMINDER_IDS[0], hour, minute }]
}

function hasNotificationConstructor(): boolean {
  return typeof window !== 'undefined' && typeof window.Notification !== 'undefined'
}

async function hasNotificationPermission(): Promise<boolean> {
  if (!hasNotificationConstructor()) return false

  if (isNativeApp()) {
    try {
      const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
      return await isPermissionGranted()
    } catch {
      return false
    }
  }

  return window.Notification.permission === 'granted'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!hasNotificationConstructor()) return false

  try {
    if (isNativeApp()) {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
      if (await isPermissionGranted()) return true
      return (await requestPermission()) === 'granted'
    }

    if (window.Notification.permission === 'granted') return true
    if (window.Notification.permission === 'denied') return false
    return (await window.Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export async function sendAppNotification(content: NotificationContent): Promise<boolean> {
  if (!(await hasNotificationPermission())) return false

  try {
    if (isNativeApp()) {
      const { sendNotification } = await import('@tauri-apps/plugin-notification')
      sendNotification({
        title: content.title,
        body: content.body,
        autoCancel: true,
        group: 'anchor',
      })
    } else {
      const notification = new window.Notification(content.title, {
        body: content.body,
        tag: 'anchor',
      })
      notification.onclick = () => window.focus()
    }
    return true
  } catch {
    return false
  }
}

/**
 * Android can keep these schedules alive while Anchor is closed. Browsers and
 * desktop shells use the foreground timer in App.tsx because the Tauri
 * desktop plugin only supports immediate notifications.
 */
export async function scheduleNativeReminderNotifications(
  settings: NotificationSettings,
  content: NotificationContent | null,
): Promise<void> {
  if (!isNativeApp() || getAppPlatform() !== 'android') return

  try {
    const { cancel, isPermissionGranted, Schedule, sendNotification } = await import('@tauri-apps/plugin-notification')
    await cancel(NATIVE_REMINDER_IDS)
    if (!content || !notificationsHaveReminder(settings) || !(await isPermissionGranted())) return

    getNativeReminderPatterns(settings).forEach((pattern) => {
      sendNotification({
        id: pattern.id,
        title: content.title,
        body: content.body,
        schedule: Schedule.interval({
          ...(pattern.weekday ? { weekday: pattern.weekday } : {}),
          ...(pattern.hour !== undefined ? { hour: pattern.hour } : {}),
          ...(pattern.minute !== undefined ? { minute: pattern.minute } : {}),
        }, true),
        autoCancel: true,
        group: 'anchor-reminders',
      })
    })
  } catch {
    // Notification permission or native scheduling is optional. The in-app
    // reminder experience continues even when the OS declines the request.
  }
}

export async function notifyAIResponse(title: string, body: string): Promise<boolean> {
  const settings = readNotificationSettings()
  if (!settings.enabled || !settings.aiResponses) return false

  return sendAppNotification({
    title,
    body: body.replace(/\s+/g, ' ').trim().slice(0, 240),
  })
}
