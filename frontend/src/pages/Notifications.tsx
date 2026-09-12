import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaXmark,
  FaGear,
  FaBellSlash,
  FaFire,
  FaBook,
  FaClock,
  FaUserGroup
} from 'react-icons/fa6'
import type { User, MainDictionaries } from '../types'
import { api, getSessionUser } from '../services/api'
import type { NotificationSettings } from '../services/notificationSettings'
import {
  getNotificationSettings,
  saveNotificationSettings,
  canShowPeriodicNotification,
  recordPeriodicNotificationShown
} from '../services/notificationSettings'

export type AppNotification = {
  id: string
  title: string
  message: string
  type: 'streak' | 'repetition' | 'habit' | 'social'
  timeText: string
  badgeText: string
  isUrgent?: boolean
  actionText: string
  actionLink: string
}

function Notifications() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(() => getSessionUser())
  const [dictionaries, setDictionaries] = useState<MainDictionaries[]>([])
  const [alerts, setAlerts] = useState<{
    messageRequests: { sender: User; unreadCount: number; lastMessageText: string; createdAt: string }[];
    friendRequests: { requestId: number; sender: User; createdAt: string }[];
  }>({ messageRequests: [], friendRequests: [] })

  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('read_notifications')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_notifications')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')

  const handleUpdateSettings = (updated: NotificationSettings) => {
    setSettings(updated)
    saveNotificationSettings(updated)
  }

  useEffect(() => {
    if (user?.id) {
      Promise.allSettled([
        api.get<User>('/auth/profile'),
        api.get<MainDictionaries[]>('/dictionaries'),
        api.get<{
          messageRequests: { sender: User; unreadCount: number; lastMessageText: string; createdAt: string }[];
          friendRequests: { requestId: number; sender: User; createdAt: string }[];
        }>('/friends/alerts'),
      ]).then(([userRes, dictsRes, alertsRes]) => {
        if (userRes.status === 'fulfilled' && userRes.value) {
          setUser(prev => prev ? { ...prev, ...userRes.value } : userRes.value)
        }
        if (dictsRes.status === 'fulfilled' && Array.isArray(dictsRes.value)) {
          setDictionaries(dictsRes.value)
        }
        if (alertsRes.status === 'fulfilled' && alertsRes.value) {
          setAlerts(alertsRes.value)
        }
      })
    }
  }, [])

  const streak = user?.streakCount || 0
  const practicedToday = user?.lastPracticeDate
    ? new Date(user.lastPracticeDate).toDateString() === new Date().toDateString()
    : false

  const practiceDict = dictionaries.find(d => (d.amountWord - (d.rememberedWords || 0)) > 0) || dictionaries[0]
  const wordsToReviewCount = practiceDict
    ? Math.max(1, Math.min(practiceDict.amountWord - (practiceDict.rememberedWords || 0), 8))
    : 8
  const dictName = practiceDict ? practiceDict.dictionaryName : 'English B2'

  const currentHour = new Date().getHours()
  const isMorning = currentHour >= 5 && currentHour < 17

  const generatedNotifications: AppNotification[] = []

  if (settings.enabled) {

    if (settings.socialAlerts) {
      alerts.messageRequests.forEach(req => {
        generatedNotifications.push({
          id: `notif-msg-req-${req.sender.id}`,
          title: `Message from ${req.sender.name}`,
          message: `"${req.lastMessageText}" (${req.unreadCount} unread message${req.unreadCount > 1 ? 's' : ''}) — You are not friends yet.`,
          type: 'social',
          timeText: 'New',
          badgeText: 'Message Request',
          isUrgent: true,
          actionText: 'Open Chat & Reply',
          actionLink: `/friends?chat=${req.sender.id}`,
        })
      })

      alerts.friendRequests.forEach(req => {
        generatedNotifications.push({
          id: `notif-friend-req-${req.requestId}`,
          title: `Friend request from ${req.sender.name}`,
          message: `${req.sender.name} sent you a friend request. Connect to share vocabulary progress and chat!`,
          type: 'social',
          timeText: 'Pending',
          badgeText: 'Friend Request',
          isUrgent: false,
          actionText: 'View Request',
          actionLink: '/friends?tab=requests',
        })
      })
    }

    if (settings.streakAlerts && !practicedToday && currentHour >= 23) {
      generatedNotifications.push({
        id: 'notif-streak-risk',
        title: 'Your streak is at risk!',
        message: `Only 1 hour left before midnight! Complete a short practice session to keep your ${streak > 0 ? `${streak}-day` : 'active'} streak.`,
        type: 'streak',
        timeText: 'Final hour',
        badgeText: 'Urgent',
        isUrgent: true,
        actionText: 'Save Streak Now',
        actionLink: practiceDict ? `/practice/${practiceDict.dictionaryId}` : '/mainDictionary',
      })
    }

    if (settings.spacedRepetition && canShowPeriodicNotification('repetition') && practiceDict && (practiceDict.amountWord - (practiceDict.rememberedWords || 0) > 0)) {
      generatedNotifications.push({
        id: 'notif-spaced-repetition',
        title: 'Time to refresh your memory (Spaced Repetition)',
        message: `You have ${wordsToReviewCount} words in "${dictName}" that are due for review. Spaced repetition boosts long-term recall!`,
        type: 'repetition',
        timeText: 'Periodic Review',
        badgeText: 'Review',
        isUrgent: false,
        actionText: 'Review Words',
        actionLink: `/practice/${practiceDict.dictionaryId}`,
      })
      recordPeriodicNotificationShown('repetition')
    }

    if (settings.dailyHabits && !practicedToday && canShowPeriodicNotification('habit') && currentHour < 23) {
      generatedNotifications.push({
        id: 'notif-daily-habit',
        title: isMorning ? 'Morning Warm-up' : 'Evening Recap',
        message: isMorning
          ? '5 minutes of morning review increases retention by +30%. Take a quick learning break!'
          : 'Reviewing before sleep improves memory consolidation. Spend 5 minutes on a short quiz!',
        type: 'habit',
        timeText: isMorning ? 'Morning' : 'Evening',
        badgeText: 'Daily Habit',
        isUrgent: false,
        actionText: practiceDict ? 'Start Practice' : 'Open Dictionaries',
        actionLink: practiceDict ? `/practice/${practiceDict.dictionaryId}` : '/mainDictionary',
      })
      recordPeriodicNotificationShown('habit')
    }
  }

  const visibleNotifications = generatedNotifications.filter(n => !dismissedIds.includes(n.id))

  const filteredNotifications = visibleNotifications.filter(n => {
    if (filter === 'unread') return !readIds.includes(n.id)
    if (filter === 'urgent') return Boolean(n.isUrgent)
    return true
  })

  const unreadCount = visibleNotifications.filter(n => !readIds.includes(n.id)).length

  const handleMarkAsRead = (id: string) => {
    const updated = readIds.includes(id)
      ? readIds.filter(item => item !== id)
      : [...readIds, id]
    setReadIds(updated)
    localStorage.setItem('read_notifications', JSON.stringify(updated))
  }

  const handleMarkAllAsRead = () => {
    const allIds = visibleNotifications.map(n => n.id)
    const updated = Array.from(new Set([...readIds, ...allIds]))
    setReadIds(updated)
    localStorage.setItem('read_notifications', JSON.stringify(updated))
  }

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated))
  }

  const handleRestoreAll = () => {
    setDismissedIds([])
    localStorage.removeItem('dismissed_notifications')
  }

  return (
    <div className='min-h-screen md:ml-60 bg-slate-900 text-white p-4 sm:p-6 lg:p-10'>
      <div className='max-w-4xl mx-auto space-y-6 sm:space-y-8'>

        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h1 className='text-2xl sm:text-3xl font-black text-white tracking-tight'>
                Notifications
              </h1>
              {unreadCount > 0 && settings.enabled && (
                <span className='px-2.5 py-0.5 text-xs font-semibold bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-full'>
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className='text-xs sm:text-sm text-slate-400 mt-1'>
              Reminders for practice, streaks, and retaining learned words
            </p>
          </div>

          <div className='flex items-center gap-2 flex-wrap'>
            <button
              onClick={() => setShowSettingsModal(true)}
              className='px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5'
              title='Notification Preferences'
            >
              <FaGear size={13} />
              <span>Settings</span>
            </button>

            {unreadCount > 0 && settings.enabled && (
              <button
                onClick={handleMarkAllAsRead}
                className='px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors'
              >
                Mark all as read
              </button>
            )}
            {dismissedIds.length > 0 && (
              <button
                onClick={handleRestoreAll}
                className='px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-400 hover:text-white transition-colors'
                title='Restore dismissed notifications'
              >
                Restore
              </button>
            )}
          </div>
        </div>

        {!settings.enabled && (
          <div className='p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='p-2.5 rounded-lg bg-slate-700/70 text-slate-400'>
                <FaBellSlash size={16} />
              </div>
              <div>
                <h4 className='text-sm font-bold text-white'>Notifications are turned off</h4>
                <p className='text-xs text-slate-400 mt-0.5'>Streak loss alerts and spaced repetition reminders are currently muted.</p>
              </div>
            </div>
            <button
              onClick={() => handleUpdateSettings({ ...settings, enabled: true })}
              className='px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors self-start sm:self-center'
            >
              Turn On
            </button>
          </div>
        )}

        <div className='flex items-center gap-2'>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors border ${
              filter === 'all'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            All ({visibleNotifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors border flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${filter === 'unread' ? 'bg-white/20 text-white' : 'bg-blue-600/30 text-blue-400'}`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-normal transition-colors border ${
              filter === 'urgent'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            Streak
          </button>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className='bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center space-y-4'>
            <div className='space-y-1 max-w-sm mx-auto'>
              <h3 className='text-base font-bold text-white'>
                No notifications
              </h3>
              <p className='text-xs sm:text-sm text-slate-400'>
                {filter === 'unread'
                  ? 'All notifications are marked as read! You are all caught up.'
                  : 'You have completed or dismissed all reminders.'}
              </p>
            </div>
            <div className='pt-2 flex justify-center gap-3'>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className='px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors'
                >
                  Show all
                </button>
              )}
              <Link
                to='/mainDictionary'
                className='px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors'
              >
                Go to Dictionaries
              </Link>
            </div>
          </div>
        ) : (
          <div className='space-y-3 sm:space-y-4'>
            {filteredNotifications.map((notif) => {
              const isRead = readIds.includes(notif.id)

              return (
                <div
                  key={notif.id}
                  className={`p-5 rounded-xl border transition-all flex items-start justify-between gap-4 relative ${
                    notif.isUrgent
                      ? 'bg-slate-800/95 border-orange-500/40'
                      : isRead
                        ? 'bg-slate-900/50 border-slate-800/80 opacity-75'
                        : 'bg-slate-800 border-slate-700'
                  }`}
                >

                  {!isRead && (
                    <span className='absolute top-4 right-10 sm:top-5 sm:right-11 w-2 h-2 rounded-full bg-blue-500'></span>
                  )}

                  <div className='space-y-2 flex-1 min-w-0 pr-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className={`text-[10px] font-semibold tracking-normal px-2 py-0.5 rounded border ${
                        notif.isUrgent
                          ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                          : 'bg-blue-600/15 text-blue-400 border-blue-500/30'
                      }`}>
                        {notif.badgeText}
                      </span>

                      <h2 className='text-sm sm:text-base font-bold text-white tracking-normal'>
                        {notif.title}
                      </h2>
                      <span className='text-[11px] text-slate-500 font-mono'>
                        • {notif.timeText}
                      </span>
                    </div>

                    <p className='text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl'>
                      {notif.message}
                    </p>

                    <div className='pt-1.5 flex items-center gap-3'>
                      <button
                        onClick={() => {
                          if (!isRead) handleMarkAsRead(notif.id)
                          navigate(notif.actionLink)
                        }}
                        className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-colors ${
                          notif.isUrgent
                            ? 'bg-orange-600 hover:bg-orange-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {notif.actionText}
                      </button>

                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className='text-xs text-slate-400 hover:text-white transition-colors px-1.5 py-1'
                        title={isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        {isRead ? 'Mark as unread' : 'Mark as read'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDismiss(notif.id)}
                    className='text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-700/60 transition-colors flex-shrink-0'
                    title='Dismiss notification'
                  >
                    <FaXmark size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {showSettingsModal && (
        <div className='fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden'>

            <div className='flex items-center justify-between p-5 sm:p-6 border-b border-slate-700'>
              <div className='flex items-center gap-2.5'>
                <div className='p-2 rounded-lg bg-slate-700/60 text-blue-400'>
                  <FaGear size={16} />
                </div>
                <div>
                  <h3 className='text-base font-bold text-white tracking-tight'>
                    Notification Preferences
                  </h3>
                  <p className='text-xs text-slate-400 mt-0.5'>
                    Configure reminder frequencies and alert rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className='text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors'
                title='Close'
              >
                <FaXmark size={16} />
              </button>
            </div>

            <div className='p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto'>

              <div className='flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700'>
                <div>
                  <h4 className='text-sm font-bold text-white'>
                    All Notifications
                  </h4>
                  <p className='text-xs text-slate-400 mt-0.5'>
                    {settings.enabled ? 'Notifications are currently active' : 'All alerts and reminders are muted'}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => handleUpdateSettings({ ...settings, enabled: !settings.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 ${
                    settings.enabled ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-sm ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className={`space-y-3 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

                <div className='flex items-start justify-between gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/70'>
                  <div className='flex items-start gap-3'>
                    <div className='p-2 rounded-lg bg-orange-500/10 text-orange-400 mt-0.5 flex-shrink-0'>
                      <FaFire size={14} />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h5 className='text-xs font-bold text-white uppercase tracking-wider'>
                          Streak Loss Warning
                        </h5>
                        <span className='px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase'>
                          1h Before Midnight
                        </span>
                      </div>
                      <p className='text-xs text-slate-400 mt-1 leading-relaxed'>
                        Only alerts you in the final hour of the day (23:00 - 23:59) if your practice is not completed.
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleUpdateSettings({ ...settings, streakAlerts: !settings.streakAlerts })}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 mt-1 ${
                      settings.streakAlerts ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${
                        settings.streakAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className='flex items-start justify-between gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/70'>
                  <div className='flex items-start gap-3'>
                    <div className='p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5 flex-shrink-0'>
                      <FaBook size={14} />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h5 className='text-xs font-bold text-white uppercase tracking-wider'>
                          Spaced Repetition
                        </h5>
                        <span className='px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 uppercase'>
                          Every 3 Days
                        </span>
                      </div>
                      <p className='text-xs text-slate-400 mt-1 leading-relaxed'>
                        Reduced frequency reminders to review older words so vocabulary stays fresh.
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleUpdateSettings({ ...settings, spacedRepetition: !settings.spacedRepetition })}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 mt-1 ${
                      settings.spacedRepetition ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${
                        settings.spacedRepetition ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className='flex items-start justify-between gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/70'>
                  <div className='flex items-start gap-3'>
                    <div className='p-2 rounded-lg bg-slate-700 text-slate-300 mt-0.5 flex-shrink-0'>
                      <FaClock size={14} />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h5 className='text-xs font-bold text-white uppercase tracking-wider'>
                          Habit Suggestions
                        </h5>
                        <span className='px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-700 text-slate-300 border border-slate-600 uppercase'>
                          Reduced Frequency
                        </span>
                      </div>
                      <p className='text-xs text-slate-400 mt-1 leading-relaxed'>
                        Infrequent learning reminders (at most once every 3 days, hidden once you practice).
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleUpdateSettings({ ...settings, dailyHabits: !settings.dailyHabits })}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 mt-1 ${
                      settings.dailyHabits ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${
                        settings.dailyHabits ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className='flex items-start justify-between gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/70'>
                  <div className='flex items-start gap-3'>
                    <div className='p-2 rounded-lg bg-slate-700 text-slate-300 mt-0.5 flex-shrink-0'>
                      <FaUserGroup size={14} />
                    </div>
                    <div>
                      <h5 className='text-xs font-bold text-white uppercase tracking-wider'>
                        Friend & Chat Alerts
                      </h5>
                      <p className='text-xs text-slate-400 mt-1 leading-relaxed'>
                        Incoming friend requests and message requests from other learners.
                      </p>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleUpdateSettings({ ...settings, socialAlerts: !settings.socialAlerts })}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer flex-shrink-0 mt-1 ${
                      settings.socialAlerts ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform transform shadow-sm ${
                        settings.socialAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>
            </div>

            <div className='p-4 sm:p-5 bg-slate-900/80 border-t border-slate-700 flex justify-end'>
              <button
                type='button'
                onClick={() => setShowSettingsModal(false)}
                className='px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors'
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications
