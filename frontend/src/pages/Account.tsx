import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaRightFromBracket,
  FaLock,
  FaPen,
  FaEye,
  FaEyeSlash,
  FaFire,
  FaFireFlameCurved,
  FaAward,
  FaTrophy,
  FaBook,
  FaCheck,
  FaArrowRight,
  FaBolt,
  FaStar,
  FaCamera,
  FaTrash,
  FaKey,
  FaBell
} from 'react-icons/fa6'
import type { User } from '../types'
import Modal from '../components/Modal'
import { api, getSessionUser, setSession, clearSession } from '../services/api'
import { getNotificationSettings, toggleMasterNotifications } from '../services/notificationSettings'

type Stats = {
  totalDictionaries: number
  totalWords: number
  learnedWords: number
}

function Account() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(() => getSessionUser())
  const [stats, setStats] = useState<Stats | null>(null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetData, setResetData] = useState({ email: '', newPassword: '' })
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const [showEditName, setShowEditName] = useState(false)
  const [showEditPass, setShowEditPass] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)

  const [notifSettings, setNotifSettings] = useState(getNotificationSettings)

  useEffect(() => {
    const handleSettingsChange = () => setNotifSettings(getNotificationSettings())
    window.addEventListener('notification-settings-changed', handleSettingsChange)
    window.addEventListener('storage', handleSettingsChange)
    return () => {
      window.removeEventListener('notification-settings-changed', handleSettingsChange)
      window.removeEventListener('storage', handleSettingsChange)
    }
  }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get<User>('/auth/profile')
        .then((freshUser) => {
          if (freshUser) {
            setUser((prev) => (prev ? { ...prev, ...freshUser } : freshUser))
            const cached = getSessionUser()
            localStorage.setItem('sessionUser', JSON.stringify({ ...(cached || {}), ...freshUser }))
          }
        })
        .catch((err) => {
          console.error('Failed to sync profile:', err);
          if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
            clearSession();
            setUser(null);
          }
        })

      api.get<Stats>('/dictionaries/stats')
        .then((data) => setStats(data))
        .catch((err) => console.error('Failed to load stats:', err))
    }
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    const cleanEmail = (authData.email || '').trim().toLowerCase();
    const cleanPassword = (authData.password || '').trim();
    const cleanName = (authData.name || '').trim();

    const payload = isLogin
      ? { email: cleanEmail, password: cleanPassword }
      : { name: cleanName, email: cleanEmail, password: cleanPassword };

    try {
      const data = await api.post<{ user: User; token: string }>(endpoint, payload);
      const userWithPassword = { ...data.user, password: cleanPassword };
      setSession(userWithPassword, data.token);
      setUser(userWithPassword);
      setShowAuthModal(false);
      api.get<Stats>('/dictionaries/stats')
        .then((statsData) => setStats(statsData))
        .catch(() => {});
      if (!isLogin) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setResetLoading(true);

    const cleanEmail = (resetData.email || '').trim().toLowerCase();
    const cleanPassword = (resetData.newPassword || '').trim();

    try {
      const data = await api.post<{ user: User; token: string; message: string }>('/auth/reset-password', {
        email: cleanEmail,
        newPassword: cleanPassword,
      });
      const userWithPassword = { ...data.user, password: cleanPassword };
      setSession(userWithPassword, data.token);
      setUser(userWithPassword);
      setResetSuccess('Password updated successfully! Logging in...');
      setTimeout(() => {
        setShowResetModal(false);
        setShowAuthModal(false);
        setResetSuccess('');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify your email.');
    } finally {
      setResetLoading(false);
    }
  }

  const handleLogout = () => {
    setUser(null);
    clearSession();
  }

  const handleUpdateProfile = (data: { field1: string; field2: string }) => {
    if (!user) return false;

    const updatePayload: any = {};
    if (showEditName) updatePayload.name = data.field1;
    if (showEditPass) updatePayload.password = data.field1;

    api.patch<User>('/auth/profile', updatePayload)
      .then((updatedUser) => {
        const newPassword = showEditPass ? data.field1 : (user as any).password;
        const userWithPassword = { ...updatedUser, password: newPassword };
        setSession(userWithPassword, localStorage.getItem('token') || '');
        setUser(userWithPassword);
        setShowEditName(false);
        setShowEditPass(false);
      })
      .catch((err) => console.error('Failed to update profile:', err));

    return true;
  }

  const compressImage = (file: File, maxSize = 320): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas context unavailable'))
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    try {
      setIsUploadingAvatar(true)
      const compressed = await compressImage(file)
      const updatedUser = await api.patch<User>('/auth/profile', { avatarUrl: compressed })
      const userWithPassword = { ...updatedUser, password: (user as any).password }
      setSession(userWithPassword, localStorage.getItem('token') || '')
      setUser(userWithPassword)
    } catch (err: any) {
      console.error('Failed to upload avatar:', err)
      alert(err.message || 'Failed to upload photo')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!user || !user.avatarUrl) return
    try {
      setIsUploadingAvatar(true)
      const updatedUser = await api.patch<User>('/auth/profile', { avatarUrl: '' })
      const userWithPassword = { ...updatedUser, password: (user as any).password }
      setSession(userWithPassword, localStorage.getItem('token') || '')
      setUser(userWithPassword)
    } catch (err: any) {
      console.error('Failed to remove avatar:', err)
      alert(err.message || 'Failed to remove photo')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const lastPractice = user?.lastPracticeDate ? new Date(user.lastPracticeDate) : null
  const practicedToday = lastPractice
    ? lastPractice.toDateString() === new Date().toDateString()
    : false

  let isStreakBroken = false
  if (lastPractice) {
    const now = new Date()
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const lastMid = new Date(lastPractice.getFullYear(), lastPractice.getMonth(), lastPractice.getDate()).getTime()
    const diffDays = Math.floor((todayMid - lastMid) / (1000 * 60 * 60 * 24))
    if (diffDays > 1) {
      isStreakBroken = true
    }
  } else {
    isStreakBroken = true
  }

  const streak = isStreakBroken ? 0 : (user?.streakCount || 0)
  const totalWords = stats?.totalWords || 0
  const totalDicts = stats?.totalDictionaries || 0
  const masteredWords = stats?.learnedWords || 0

  const totalXp = (totalWords * 10) + (masteredWords * 50) + (streak * 25)
  const xpPerLevel = 300
  const level = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1)
  const currentLevelXp = totalXp % xpPerLevel
  const levelProgressPercent = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100))

  const getTierTitle = (lvl: number) => {
    if (lvl <= 2) return 'Novice Scholar'
    if (lvl <= 5) return 'Lexicon Explorer'
    if (lvl <= 9) return 'Word Collector'
    return 'Master Polyglot'
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const rawToday = new Date().getDay()
  const todayIndex = rawToday === 0 ? 6 : rawToday - 1

  const weekDays = dayNames.map((label, idx) => {
    const isToday = idx === todayIndex
    const isFuture = idx > todayIndex

    let isActive = false
    if (streak > 0) {
      if (isToday) {
        isActive = practicedToday
      } else if (!isFuture) {
        const daysAgo = todayIndex - idx
        if (practicedToday) {
          isActive = daysAgo < streak
        } else {
          isActive = daysAgo <= streak
        }
      }
    }

    return {
      label,
      isToday,
      isFuture,
      isActive,
    }
  })

  const achievements = [
    {
      id: 'wildfire',
      title: 'Wildfire',
      desc: 'Reach a 7-day learning streak',
      icon: <FaFireFlameCurved className='text-orange-600' size={20} />,
      current: Math.min(streak, 7),
      target: 7,
      unit: 'days',
      completed: streak >= 7
    },
    {
      id: 'collector',
      title: 'Word Collector',
      desc: 'Add 50 words across your dictionaries',
      image: '/AchiveIcon/WordCollector.jpg',
      current: Math.min(totalWords, 50),
      target: 50,
      unit: 'words',
      completed: totalWords >= 50
    },
    {
      id: 'sharpshooter',
      title: 'Sharpshooter',
      desc: 'Master 20 words through practice',
      image: '/AchiveIcon/SharpShooter.jpg',
      current: Math.min(masteredWords, 20),
      target: 20,
      unit: 'words',
      completed: masteredWords >= 20
    },
    {
      id: 'polyglot',
      title: 'Polyglot',
      desc: 'Create at least 2 different dictionaries',
      image: '/AchiveIcon/Poliglot.jpg',
      current: Math.min(totalDicts, 2),
      target: 2,
      unit: 'dicts',
      completed: totalDicts >= 2
    }
  ]

  if (!user) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4 md:ml-60 bg-slate-900'>
        <div className='w-full max-w-lg text-center space-y-8'>
          <div className='space-y-4'>
            <div className='w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-500 mx-auto border border-slate-700'>
              <FaUser size={32} />
            </div>
            <h1 className='text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none'>
              Join the <span className='text-blue-500'>Club</span>
            </h1>
            <p className='text-slate-400 font-medium max-w-xs mx-auto text-sm'>
              Create an account or sign in to save your progress, track streaks, and access all features.
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <button
              onClick={() => { setIsLogin(true); setError(''); setShowAuthModal(true); }}
              className='p-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors uppercase tracking-widest text-sm'
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setShowAuthModal(true); }}
              className='p-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700 uppercase tracking-widest text-sm'
            >
              Sign Up
            </button>
          </div>

          {showAuthModal && (
            <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-2' onClick={() => setShowAuthModal(false)}>
              <div className='bg-slate-800 rounded-xl p-6 sm:p-8 w-[90%] max-w-md border border-slate-700 overflow-y-auto max-h-[90vh]' onClick={e => e.stopPropagation()}>
                <div className='flex items-center justify-between mb-6'>
                  <div className='w-8'></div>
                  <h2 className='text-xl sm:text-2xl font-bold text-white text-center flex-1 uppercase tracking-tighter'>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                  </h2>
                  <div className='w-8'></div>
                </div>

                <form onSubmit={handleAuth} className='flex flex-col gap-4 text-left'>
                  {!isLogin && (
                    <div className='flex flex-col gap-1.5'>
                      <label className='text-xs font-semibold text-white/80 uppercase tracking-wider'>Name</label>
                      <input
                        type="text" required value={authData.name}
                        onChange={e => setAuthData(prev => ({...prev, name: e.target.value}))}
                        className='px-3.5 py-2.5 text-sm bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-slate-600'
                        placeholder='Full Name'
                      />
                    </div>
                  )}

                  <div className='flex flex-col gap-1.5'>
                    <label className='text-xs font-semibold text-white/80 uppercase tracking-wider'>Email</label>
                    <input
                      type="email"
                      required
                      value={authData.email}
                      onChange={e => setAuthData(prev => ({...prev, email: e.target.value}))}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className='px-3.5 py-2.5 text-sm bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-slate-600'
                      placeholder='hello@example.com'
                    />
                  </div>

                  <div className='flex flex-col gap-1.5'>
                    <label className='text-xs font-semibold text-white/80 uppercase tracking-wider'>Password</label>
                    <div className='relative'>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={authData.password}
                        onChange={e => setAuthData(prev => ({...prev, password: e.target.value}))}
                        autoCapitalize="none"
                        autoCorrect="off"
                        className='px-3.5 py-2.5 text-sm bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12 border border-slate-600'
                        placeholder='••••••••'
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1'
                      >
                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setResetData({ email: authData.email || '', newPassword: '' });
                          setShowResetModal(true);
                        }}
                        className='text-[11px] text-blue-400 hover:text-blue-300 self-end mt-0.5 transition-colors font-medium'
                      >
                        Forgot / Reset password?
                      </button>
                    )}
                  </div>

                  {error && <p className='text-rose-400 text-xs text-center font-semibold mt-1'>{error}</p>}

                  <div className='flex flex-col gap-3 mt-4'>
                    <div className='flex flex-row gap-3'>
                      <button
                        type="button"
                        className='flex-1 py-3 text-sm bg-slate-700 text-white rounded-lg font-semibold uppercase tracking-wider hover:bg-slate-600 transition-colors border border-slate-600'
                        onClick={() => setShowAuthModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className='flex-1 py-3 text-sm bg-blue-600 text-white rounded-lg font-semibold uppercase tracking-wider hover:bg-blue-500 transition-colors'
                      >
                        {isLogin ? 'Login' : 'Join'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setIsLogin(!isLogin); setError(''); }}
                      className='text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors mt-2 text-center'
                    >
                      {isLogin ? "Need an account? Sign Up" : "Have an account? Sign In"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showResetModal && (
            <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-[220] p-2' onClick={() => setShowResetModal(false)}>
              <div className='bg-slate-800 rounded-xl p-6 sm:p-8 w-[90%] max-w-md border border-slate-700 space-y-4' onClick={e => e.stopPropagation()}>
                <div className='flex items-center gap-2 border-b border-slate-700 pb-3'>
                  <FaKey className='text-blue-400' size={16} />
                  <h3 className='text-lg font-bold text-white uppercase tracking-tight'>Reset Password</h3>
                </div>
                <p className='text-xs text-slate-400 leading-relaxed text-left'>
                  Enter your registered email address and set a new password for your account.
                </p>
                <form onSubmit={handleResetPassword} className='flex flex-col gap-3.5 text-left'>
                  <div className='flex flex-col gap-1'>
                    <label className='text-xs font-semibold text-slate-300'>Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetData.email}
                      onChange={e => setResetData(prev => ({ ...prev, email: e.target.value }))}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className='px-3.5 py-2.5 text-sm bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600'
                      placeholder='hello@example.com'
                    />
                  </div>
                  <div className='flex flex-col gap-1'>
                    <label className='text-xs font-semibold text-slate-300'>New Password (min 6 characters)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={resetData.newPassword}
                      onChange={e => setResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                      autoCapitalize="none"
                      autoCorrect="off"
                      className='px-3.5 py-2.5 text-sm bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600'
                      placeholder='Enter new password'
                    />
                  </div>
                  {error && <p className='text-rose-400 text-xs font-semibold text-center'>{error}</p>}
                  {resetSuccess && <p className='text-emerald-400 text-xs font-semibold text-center'>{resetSuccess}</p>}
                  <div className='flex gap-3 pt-2'>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className='flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors'
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className='flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50'
                    >
                      {resetLoading ? 'Saving...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen p-4 pb-28 sm:p-8 sm:pb-8 md:ml-60 bg-slate-900 text-white flex flex-col items-center'>
      <div className='w-full max-w-5xl space-y-8'>

        <div className='flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8'>

          <div className='order-1 lg:order-none lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2 space-y-6 lg:self-start'>

            <div className='bg-slate-800 p-6 rounded-xl border border-slate-700 text-center space-y-4'>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <div className='relative w-28 h-28 mx-auto group'>
                <div className='w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-black border-4 border-slate-700 overflow-hidden'>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className='w-full h-full object-cover' />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'U'
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Change Profile Photo"
                  className='absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1 cursor-pointer'
                >
                  <FaCamera size={20} />
                  <span>{isUploadingAvatar ? 'Saving...' : 'Change'}</span>
                </button>
              </div>

              <div className='flex items-center justify-center gap-2'>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className='px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 border border-slate-600'
                >
                  <FaCamera size={12} />
                  <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                </button>

                {user.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className='p-2 bg-slate-700 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg text-xs transition-colors border border-slate-600 hover:border-rose-900/50'
                    title="Remove Photo"
                  >
                    <FaTrash size={12} />
                  </button>
                )}
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-center gap-2'>
                  <h2 className='text-xl font-bold text-white tracking-tight truncate max-w-[200px]'>
                    {user.name}
                  </h2>
                  <button
                    onClick={() => setShowEditName(true)}
                    className='text-slate-400 hover:text-white p-1 transition-colors'
                    title="Edit Name"
                  >
                    <FaPen size={13} />
                  </button>
                </div>
                <p className='text-xs text-slate-400 font-mono'>
                  @{user.name.toLowerCase().replace(/\s+/g, '_')}
                </p>

                <div className='pt-1 flex justify-center'>
                  <button
                    onClick={handleLogout}
                    className='px-3.5 py-1.5 bg-slate-700/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-lg transition-colors border border-slate-600 hover:border-rose-900/50 flex items-center gap-1.5 font-semibold text-xs tracking-wider'
                    title="Log Out"
                  >
                    <FaRightFromBracket size={12} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>

              <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700 border border-slate-600 text-blue-400 text-xs font-semibold uppercase tracking-wider'>
                <FaAward size={12} />
                <span>{getTierTitle(level)}</span>
              </div>
            </div>

            <div className='bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4'>
              <div className='flex items-center gap-2 border-b border-slate-700 pb-3'>
                <FaLock className='text-blue-400' size={14} />
                <h3 className='text-sm font-bold text-white uppercase tracking-wider'>
                  Account & Security
                </h3>
              </div>

              <div className='space-y-3 text-left'>

                <div className='p-3 bg-slate-900 rounded-lg border border-slate-700/80 space-y-1'>
                  <div className='flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider'>
                    <FaEnvelope size={11} />
                    <span>Email Address</span>
                  </div>
                  <div className='text-sm font-semibold text-white truncate' title={user.email}>
                    {user.email}
                  </div>
                </div>

                <div className='p-3 bg-slate-900 rounded-lg border border-slate-700/80 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider'>
                      <FaLock size={11} />
                      <span>Password</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className='text-slate-400 hover:text-white transition-colors p-1'
                      title="Peek Password"
                    >
                      {showCurrentPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>
                  <div className='text-sm font-mono text-white tracking-wider'>
                    {showCurrentPassword ? ((user as any).password || '••••••••') : '••••••••'}
                  </div>
                </div>

                <div className='p-3 bg-slate-900 rounded-lg border border-slate-700/80 space-y-1'>
                  <div className='flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider'>
                    <FaCalendar size={11} />
                    <span>Account Status</span>
                  </div>
                  <div className='text-xs font-semibold text-slate-300'>
                    Active Learner (Standard Tier)
                  </div>
                </div>

                <div className='p-3 bg-slate-900 rounded-lg border border-slate-700/80 space-y-1.5'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider'>
                      <FaBell size={11} />
                      <span>Notifications</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMasterNotifications()}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors border cursor-pointer ${
                        notifSettings.enabled
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                      title={notifSettings.enabled ? 'Click to mute all notifications' : 'Click to enable notifications'}
                    >
                      {notifSettings.enabled ? 'Enabled' : 'Muted'}
                    </button>
                  </div>
                  <div className='flex items-center justify-between text-xs text-slate-400 pt-0.5'>
                    <span className='truncate text-[11px]'>Streak & review alerts</span>
                    <Link to='/notifications' className='text-blue-400 hover:text-blue-300 text-[11px] font-medium flex-shrink-0'>
                      Configure
                    </Link>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowEditPass(true)}
                className='w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-slate-600 text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2'
              >
                <FaLock size={12} />
                <span>Change Password</span>
              </button>
            </div>

            <div className='bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3 text-left'>
              <h4 className='text-xs font-bold text-white uppercase tracking-wider'>
                Keep Your Momentum
              </h4>
              <p className='text-xs text-slate-400 leading-relaxed'>
                Daily practice sessions boost long-term memory retention by up to 80%.
              </p>
              <button
                onClick={() => navigate('/practice')}
                className='w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2'
              >
                <span>Go to Practice</span>
                <FaArrowRight size={12} />
              </button>
            </div>

          </div>

          <div className='order-2 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-6'>

            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'>

              <div className='bg-slate-800 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between'>
                <div className='w-9 h-9 mx-auto bg-slate-700 text-orange-500 rounded-lg flex items-center justify-center border border-slate-600 mb-2'>
                  <FaFire size={18} />
                </div>
                <div>
                  <div className='text-2xl sm:text-3xl font-black text-white leading-none'>
                    {streak}
                  </div>
                  <div className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1'>
                    Day Streak
                  </div>
                </div>
                <div className='text-[9px] font-semibold text-amber-400/90 mt-2 bg-slate-900/60 py-0.5 px-1.5 rounded border border-slate-700/60 truncate'>
                  {streak > 0 ? 'Active Flame' : 'Start streak'}
                </div>
              </div>

              <div className='bg-slate-800 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between'>
                <div className='w-9 h-9 mx-auto bg-slate-700 text-blue-400 rounded-lg flex items-center justify-center border border-slate-600 mb-2'>
                  <FaBook size={16} />
                </div>
                <div>
                  <div className='text-2xl sm:text-3xl font-black text-white leading-none'>
                    {totalDicts}
                  </div>
                  <div className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1'>
                    Dictionaries
                  </div>
                </div>
                <div className='text-[9px] font-semibold text-blue-400/90 mt-2 bg-slate-900/60 py-0.5 px-1.5 rounded border border-slate-700/60 truncate'>
                  Collections
                </div>
              </div>

              <div className='bg-slate-800 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between'>
                <div className='w-9 h-9 mx-auto bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center border border-slate-600 mb-2'>
                  <FaBolt size={16} />
                </div>
                <div>
                  <div className='text-2xl sm:text-3xl font-black text-white leading-none'>
                    {totalWords}
                  </div>
                  <div className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1'>
                    Total Words
                  </div>
                </div>
                <div className='text-[9px] font-semibold text-slate-400 mt-2 bg-slate-900/60 py-0.5 px-1.5 rounded border border-slate-700/60 truncate'>
                  Saved vocabulary
                </div>
              </div>

              <div className='bg-slate-800 p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-between'>
                <div className='w-9 h-9 mx-auto bg-slate-700 text-amber-400 rounded-lg flex items-center justify-center border border-slate-600 mb-2'>
                  <FaTrophy size={16} />
                </div>
                <div>
                  <div className='text-2xl sm:text-3xl font-black text-white leading-none'>
                    {masteredWords}
                  </div>
                  <div className='text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-1'>
                    Mastered
                  </div>
                </div>
                <div className='text-[9px] font-semibold text-amber-400/90 mt-2 bg-slate-900/60 py-0.5 px-1.5 rounded border border-slate-700/60 truncate'>
                  {totalWords > 0 ? `${Math.round((masteredWords / totalWords) * 100)}% Learned` : '0%'}
                </div>
              </div>
            </div>

            <div className='bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-base font-bold text-white uppercase tracking-wider'>
                  Weekly Streak Calendar
                </h3>
                <span className='text-xs font-semibold text-slate-400'>
                  {streak > 0 ? `${streak} Days in a Row` : 'No active streak'}
                </span>
              </div>

              <div className='grid grid-cols-7 gap-1.5 sm:gap-2 pt-1'>
                {weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border transition-colors relative ${
                      day.isToday
                        ? 'border-blue-500 bg-slate-800'
                        : day.isActive
                          ? 'bg-slate-700/80 border-amber-500/40 text-white'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-500'
                    }`}
                  >
                    {day.isToday && (
                      <span className='absolute -top-2 px-1.5 py-0.2 bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider rounded shadow-none'>
                        Today
                      </span>
                    )}
                    <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                      day.isToday ? 'text-blue-400 font-black' : day.isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {day.label}
                    </span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                      day.isActive
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : day.isToday
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-600 border border-slate-700'
                    }`}>
                      {day.isActive ? (
                        <FaFireFlameCurved size={12} className='text-orange-400' />
                      ) : day.isToday ? (
                        <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                      ) : (
                        <span className='w-1.5 h-1.5 rounded-full bg-slate-600'></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className='text-xs text-slate-400 text-center sm:text-left pt-1'>
                {practicedToday
                  ? '🔥 Streak protected! You completed practice today. Keep it up tomorrow!'
                  : streak > 0
                    ? `⚠️ Practice today to keep your ${streak}-day streak alive!`
                    : 'Complete a practice session today to start your streak!'}
              </p>
            </div>

            <div className='bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-blue-400'>
                    <FaAward size={20} />
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold text-white text-base uppercase tracking-wider'>
                        Level {level}
                      </span>
                      <span className='text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30'>
                        {getTierTitle(level)}
                      </span>
                    </div>
                    <p className='text-xs text-slate-400 mt-0.5'>
                      {xpPerLevel - currentLevelXp} XP until Level {level + 1}
                    </p>
                  </div>
                </div>

                <span className='text-xs font-mono font-bold text-slate-300'>
                  {currentLevelXp} / {xpPerLevel} XP
                </span>
              </div>

              <div className='w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700'>
                <div
                  className='h-full bg-blue-600 transition-all duration-500 rounded-full'
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>

              <div className='flex items-center justify-between text-[11px] text-slate-400 pt-1'>
                <span>Total Experience: <strong className='text-white font-mono'>{totalXp} XP</strong></span>
                <span>Progress: <strong className='text-blue-400 font-mono'>{levelProgressPercent}%</strong></span>
              </div>
            </div>

          </div>

          <div className='order-3 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-2 space-y-6'>

            <div className='bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <FaStar className='text-amber-300' size={18} />
                  <h3 className='text-base font-bold text-white uppercase tracking-wider'>
                    Achievements
                  </h3>
                </div>
                <span className='text-xs text-slate-400'>
                  {achievements.filter(a => a.completed).length} of {achievements.length} Unlocked
                </span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border space-y-3 flex flex-col justify-between transition-all ${
                      ach.completed
                        ? 'bg-slate-900/70 border-slate-700/80'
                        : 'bg-slate-900/40 border-slate-800/80'
                    }`}
                  >
                    <div className='flex items-start gap-3'>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border transition-all ${
                        ach.completed
                          ? ach.image
                            ? 'bg-slate-800 border-slate-700'
                            : 'bg-amber-100 border-amber-300'
                          : ach.image
                            ? 'bg-slate-800 border-slate-700/60 grayscale opacity-40'
                            : 'bg-slate-200 border-slate-300 grayscale opacity-40'
                      }`}>
                        {ach.image ? (
                          <img
                            src={ach.image}
                            alt={ach.title}
                            className={`w-full h-full object-cover transition-all ${
                              ach.completed ? 'grayscale-0 opacity-100' : 'grayscale opacity-40'
                            }`}
                          />
                        ) : (
                          ach.icon
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between gap-2'>
                          <h4 className={`text-sm font-bold uppercase tracking-wider truncate transition-colors ${
                            ach.completed ? 'text-white' : 'text-slate-400'
                          }`}>
                            {ach.title}
                          </h4>
                          {ach.completed && (
                            <span className='text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center gap-1'>
                              <FaCheck size={8} /> Done
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 leading-snug transition-colors ${
                          ach.completed ? 'text-slate-300' : 'text-slate-500'
                        }`}>
                          {ach.desc}
                        </p>
                      </div>
                    </div>

                    <div className='space-y-1 pt-1'>
                      <div className={`flex justify-between text-[10px] font-mono ${
                        ach.completed ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <span>Progress</span>
                        <span>{ach.current} / {ach.target} {ach.unit}</span>
                      </div>
                      <div className='w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700'>
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${ach.completed ? 'bg-amber-400' : 'bg-blue-600/50'}`}
                          style={{ width: `${Math.min(100, Math.round((ach.current / ach.target) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {showEditName && (
        <Modal
          name="Change Name"
          input1="New Name"
          placeholder1={user.name}
          buttonText="Update"
          onClose={() => setShowEditName(false)}
          onCreate={handleUpdateProfile}
          defaultValue1={user.name}
          input2Type="hidden"
        />
      )}

      {showEditPass && (
        <Modal
          name="Change Password"
          input1="New Password"
          placeholder1="••••••••"
          buttonText="Update"
          onClose={() => setShowEditPass(false)}
          onCreate={handleUpdateProfile}
          input2Type="hidden"
        />
      )}
    </div>
  )
}

export default Account
