export interface NotificationSettings {
  enabled: boolean;
  streakAlerts: boolean;
  spacedRepetition: boolean;
  dailyHabits: boolean;
  socialAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  streakAlerts: true,
  spacedRepetition: true,
  dailyHabits: true,
  socialAlerts: true,
};

const SETTINGS_KEY = 'app_notification_settings';
const COOLDOWN_KEY_PREFIX = 'app_notif_cooldown_';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const saveNotificationSettings = (settings: NotificationSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('notification-settings-changed'));
};

export const toggleMasterNotifications = (): boolean => {
  const current = getNotificationSettings();
  const updated = { ...current, enabled: !current.enabled };
  saveNotificationSettings(updated);
  return updated.enabled;
};

export const canShowPeriodicNotification = (key: 'repetition' | 'habit'): boolean => {
  try {
    const lastTimeStr = localStorage.getItem(`${COOLDOWN_KEY_PREFIX}${key}`);
    if (!lastTimeStr) return true;
    const lastTime = Number(lastTimeStr);
    if (isNaN(lastTime)) return true;
    return Date.now() - lastTime >= THREE_DAYS_MS;
  } catch {
    return true;
  }
};

export const recordPeriodicNotificationShown = (key: 'repetition' | 'habit'): void => {
  try {
    localStorage.setItem(`${COOLDOWN_KEY_PREFIX}${key}`, Date.now().toString());
  } catch {

  }
};
