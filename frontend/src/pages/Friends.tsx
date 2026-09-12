import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FaUserGroup,
  FaUserPlus,
  FaMagnifyingGlass,
  FaMessage,
  FaCheck,
  FaXmark,
  FaFire,
  FaBook,
  FaBolt,
  FaGraduationCap,
  FaPaperPlane,
  FaTrash,
  FaArrowLeft,
  FaReply,
  FaPen,
  FaFaceSmile
} from 'react-icons/fa6'
import type { User, FriendItem, FriendRequestItem, SearchUserItem, DirectMessageItem } from '../types'
import { api, getSessionUser } from '../services/api'
import { initSocket, getSocket, playNotificationSound, formatLastSeen } from '../services/socket'

type TabType = 'friends' | 'requests' | 'search';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏', '🎉']

function Friends() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSessionUser())
  const [activeTab, setActiveTab] = useState<TabType>('friends')

  const [friends, setFriends] = useState<FriendItem[]>([])
  const [requests, setRequests] = useState<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>({
    incoming: [],
    outgoing: []
  })
  const [loading, setLoading] = useState(true)

  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set())
  const [isFriendTyping, setIsFriendTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeChatFriendRef = useRef<User | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [activeChatFriend, setActiveChatFriend] = useState<User | null>(null)
  const [messages, setMessages] = useState<DirectMessageItem[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [replyingTo, setReplyingTo] = useState<DirectMessageItem | null>(null)
  const [editingMessage, setEditingMessage] = useState<DirectMessageItem | null>(null)
  const [openReactionMsgId, setOpenReactionMsgId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    activeChatFriendRef.current = activeChatFriend
    setIsFriendTyping(false)
  }, [activeChatFriend])

  const [inspectUser, setInspectUser] = useState<{
    user: User;
    stats: { totalDictionaries: number; totalWords: number; learnedWords: number };
  } | null>(null)

  const [friendFilterText, setFriendFilterText] = useState('')

  useEffect(() => {
    const user = getSessionUser()
    setCurrentUser(user)
  }, [])

  const loadSocialData = async () => {
    if (!currentUser?.id) return
    try {
      setLoading(true)
      const [friendsData, requestsData] = await Promise.all([
        api.get<FriendItem[]>('/friends'),
        api.get<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>('/friends/requests')
      ])
      setFriends(friendsData || [])
      setRequests(requestsData || { incoming: [], outgoing: [] })
    } catch (err) {
      console.error('Failed to load friends data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSocialData()
  }, [currentUser?.id])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'requests' || tabParam === 'search' || tabParam === 'friends') {
      setActiveTab(tabParam as TabType)
    }

    const chatId = searchParams.get('chat')
    if (chatId) {
      const idNum = parseInt(chatId, 10)
      if (!isNaN(idNum)) {
        const found = friends.find(f => f.friend.id === idNum)
        if (found) {
          setActiveChatFriend(found.friend)
        } else {

          api.get<{
            id: number;
            name: string;
            email: string;
            avatarUrl?: string;
            streakCount: number;
            stats: { totalDictionaries: number; totalWords: number; learnedWords: number };
          }>(`/friends/user/${idNum}/stats`)
            .then(data => {
              if (data?.id) {
                setActiveChatFriend({
                  id: data.id,
                  name: data.name,
                  email: data.email,
                  avatarUrl: data.avatarUrl,
                  streakCount: data.streakCount || 0
                } as User)
              }
            })
            .catch(err => console.error('Could not load user for chat:', err))
        }
      }
    }
  }, [searchParams, friends])

  useEffect(() => {
    if (!currentUser?.id) return

    const socket = initSocket(currentUser.id)

    socket.on('presence:init', (data: { onlineUserIds: number[] }) => {
      setOnlineUserIds(new Set(data.onlineUserIds))
    })

    socket.on('presence:update', (data: { userId: number; isOnline: boolean; lastSeen?: string }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev)
        if (data.isOnline) {
          next.add(data.userId)
        } else {
          next.delete(data.userId)
        }
        return next
      })

      setFriends(prev =>
        prev.map(f => {
          if (f.friend.id === data.userId) {
            return {
              ...f,
              friend: {
                ...f.friend,
                isOnline: data.isOnline,
                lastSeen: data.lastSeen !== undefined ? data.lastSeen : f.friend.lastSeen,
              },
            }
          }
          return f
        })
      )
    })

    socket.on('chat:typing', (data: { senderId: number; isTyping: boolean }) => {
      if (activeChatFriendRef.current?.id === data.senderId) {
        setIsFriendTyping(data.isTyping)
      }
    })

    socket.on('message:new', (msg: DirectMessageItem) => {
      const currentActive = activeChatFriendRef.current
      if (currentActive && (msg.senderId === currentActive.id || msg.receiverId === currentActive.id)) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        if (msg.senderId === currentActive.id) {
          playNotificationSound()
        }
      } else if (msg.senderId !== currentUser.id) {

        playNotificationSound()
        setFriends(prev =>
          prev.map(f => {
            if (f.friend.id === msg.senderId) {
              return {
                ...f,
                unreadCount: (f.unreadCount || 0) + 1,
                lastMessage: {
                  text: msg.text,
                  createdAt: msg.createdAt,
                  senderId: msg.senderId,
                },
              }
            }
            return f
          })
        )
      }
    })

    socket.on('message:edited', (updated: DirectMessageItem) => {
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    })

    socket.on('message:deleted', (data: { messageId: number }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId))
    })

    socket.on('message:reaction', (data: { messageId: number; reactions: Record<string, number[]> }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
    })

    return () => {
      socket.off('presence:init')
      socket.off('presence:update')
      socket.off('chat:typing')
      socket.off('message:new')
      socket.off('message:edited')
      socket.off('message:deleted')
      socket.off('message:reaction')
    }
  }, [currentUser?.id])

  const loadMessages = async (friendId: number) => {
    try {
      const msgs = await api.get<DirectMessageItem[]>(`/friends/messages/${friendId}`)
      setMessages(msgs || [])
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  useEffect(() => {
    if (!activeChatFriend) return
    loadMessages(activeChatFriend.id)
  }, [activeChatFriend?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true)
        const results = await api.get<SearchUserItem[]>(`/friends/search?q=${encodeURIComponent(query)}`)
        setSearchResults(results || [])
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSendRequest = async (targetUserId: number) => {
    try {
      await api.post(`/friends/request/${targetUserId}`)
      setSearchResults(prev =>
        prev.map(u => u.id === targetUserId ? { ...u, relationship: 'REQUEST_SENT' } : u)
      )
      loadSocialData()
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request')
    }
  }

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await api.post(`/friends/accept/${requestId}`)
      loadSocialData()
    } catch (err: any) {
      alert(err.message || 'Failed to accept request')
    }
  }

  const handleDeclineRequest = async (requestId: number) => {
    try {
      await api.post(`/friends/decline/${requestId}`)
      loadSocialData()
    } catch (err: any) {
      alert(err.message || 'Failed to decline request')
    }
  }

  const handleRemoveFriend = async (friendId: number, friendName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${friendName} from your friends?`)) return
    try {
      await api.delete(`/friends/${friendId}`)
      if (activeChatFriend?.id === friendId) {
        handleBackFromChat()
      }
      loadSocialData()
    } catch (err: any) {
      alert(err.message || 'Failed to remove friend')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessageInput(value)

    if (!activeChatFriend) return
    const socket = getSocket()
    if (!socket) return

    socket.emit('chat:typing', { recipientId: activeChatFriend.id, isTyping: true })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { recipientId: activeChatFriend.id, isTyping: false })
    }, 1800)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeChatFriend || !messageInput.trim() || isSendingMessage) return

    const textToSend = messageInput.trim()
    setIsSendingMessage(true)

    if (activeChatFriend) {
      getSocket()?.emit('chat:typing', { recipientId: activeChatFriend.id, isTyping: false })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    try {
      if (editingMessage) {

        const updated = await api.patch<DirectMessageItem>(`/friends/messages/${editingMessage.id}`, {
          text: textToSend
        })
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
        setEditingMessage(null)
        setMessageInput('')
      } else {

        const sentMsg = await api.post<DirectMessageItem>(`/friends/messages/${activeChatFriend.id}`, {
          text: textToSend,
          replyToId: replyingTo?.id
        })
        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev
          return [...prev, sentMsg]
        })
        setReplyingTo(null)
        setMessageInput('')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return
    try {
      await api.delete(`/friends/messages/${messageId}`)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      if (editingMessage?.id === messageId) {
        setEditingMessage(null)
        setMessageInput('')
      }
      if (replyingTo?.id === messageId) {
        setReplyingTo(null)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete message')
    }
  }

  const handleReactToMessage = async (messageId: number, emoji: string) => {
    try {
      const updated = await api.post<DirectMessageItem>(`/friends/messages/${messageId}/react`, { emoji })
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: updated.reactions } : m))
      setOpenReactionMsgId(null)
    } catch (err: any) {
      console.error('Failed to react:', err)
    }
  }

  const startReply = (msg: DirectMessageItem) => {
    setEditingMessage(null)
    setReplyingTo(msg)
    chatInputRef.current?.focus()
  }

  const startEdit = (msg: DirectMessageItem) => {
    setReplyingTo(null)
    setEditingMessage(msg)
    setMessageInput(msg.text)
    chatInputRef.current?.focus()
  }

  const handleBackFromChat = () => {
    setActiveChatFriend(null)
    setReplyingTo(null)
    setEditingMessage(null)
    setMessageInput('')
    setOpenReactionMsgId(null)
    if (searchParams.get('chat')) {
      const next = new URLSearchParams(searchParams)
      next.delete('chat')
      setSearchParams(next, { replace: true })
    }
  }

  const openUserProfile = async (user: User) => {
    try {
      const data = await api.get<{
        id: number;
        name: string;
        email: string;
        avatarUrl?: string;
        streakCount: number;
        stats: { totalDictionaries: number; totalWords: number; learnedWords: number };
      }>(`/friends/user/${user.id}/stats`)
      setInspectUser({ user, stats: data.stats })
    } catch (err) {
      console.error('Failed to fetch user stats:', err)
    }
  }

  const filteredFriends = friends.filter(item => {
    if (!friendFilterText.trim()) return true
    const q = friendFilterText.toLowerCase()
    return item.friend.name.toLowerCase().includes(q) || item.friend.email.toLowerCase().includes(q)
  })

  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (isToday) return timeStr
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`
  }

  if (!currentUser) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4 md:ml-60 bg-slate-900 text-white'>
        <div className='w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-6'>
          <div className='w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30'>
            <FaUserGroup size={28} />
          </div>
          <div className='space-y-2'>
            <h2 className='text-2xl font-black uppercase tracking-tight text-white'>
              Friends & Community
            </h2>
            <p className='text-xs text-slate-400 leading-relaxed'>
              Sign in to search for other learners, send friend requests, review their learning statistics, and chat in real-time!
            </p>
          </div>
          <button
            onClick={() => navigate('/account')}
            className='w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors'
          >
            Sign In / Register
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen md:ml-60 bg-slate-900 text-white p-4 sm:p-6 lg:p-8'>
      <div className='max-w-6xl mx-auto space-y-6'>

        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6'>
          <div>
            <div className='flex items-center gap-3'>
              <h1 className='text-2xl sm:text-3xl font-black text-white tracking-tight'>
                Friends
              </h1>
              <span className='px-2.5 py-0.5 text-xs font-semibold bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-full'>
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
              </span>
            </div>
            <p className='text-xs sm:text-sm text-slate-400 mt-1'>
              Connect with fellow learners, track their vocabulary progress, and practice together
            </p>
          </div>

          <div className='flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80'>
            <button
              onClick={() => { setActiveTab('friends'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'friends'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaUserGroup size={13} />
              <span>Friends ({friends.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('requests'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaUserPlus size={13} />
              <span>Requests</span>
              {requests.incoming.length > 0 && (
                <span className='w-2 h-2 rounded-full bg-blue-400 animate-pulse'></span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('search'); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FaMagnifyingGlass size={12} />
              <span>Find Users</span>
            </button>
          </div>
        </div>

        {activeChatFriend ? (

          <div className='bg-slate-800 border border-slate-700 rounded-2xl flex flex-col h-[75vh] overflow-hidden'>

            <div className='p-4 border-b border-slate-700 bg-slate-800/90 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <button
                  onClick={handleBackFromChat}
                  className='p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors'
                  title='Back to friends list'
                >
                  <FaArrowLeft size={14} />
                </button>

                <div
                  onClick={() => openUserProfile(activeChatFriend)}
                  className='flex items-center gap-3 cursor-pointer group'
                  title='Click to view profile & statistics'
                >
                  <div className='w-10 h-10 rounded-full bg-blue-600 border border-slate-600 group-hover:border-blue-500 overflow-hidden flex items-center justify-center font-bold text-white text-sm flex-shrink-0 transition-colors'>
                    {activeChatFriend.avatarUrl ? (
                      <img src={activeChatFriend.avatarUrl} alt={activeChatFriend.name} className='w-full h-full object-cover' />
                    ) : (
                      activeChatFriend.name ? activeChatFriend.name[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <h3 className='text-sm font-bold text-white group-hover:text-blue-400 transition-colors'>{activeChatFriend.name}</h3>
                      {activeChatFriend.streakCount > 0 && (
                        <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded'>
                          <FaFire size={9} /> {activeChatFriend.streakCount}d
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-1.5 text-[10px] mt-0.5'>
                      <span className={`w-2 h-2 rounded-full ${onlineUserIds.has(activeChatFriend.id) ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span className={onlineUserIds.has(activeChatFriend.id) ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
                        {formatLastSeen(activeChatFriend.lastSeen, onlineUserIds.has(activeChatFriend.id))}
                      </span>
                      <span className='text-slate-600'>•</span>
                      <span className='text-slate-400 group-hover:text-slate-300 transition-colors truncate max-w-[160px]'>{activeChatFriend.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className='flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-900/40'
              onClick={() => setOpenReactionMsgId(null)}
            >
              {messages.length === 0 ? (
                <div className='h-full flex flex-col items-center justify-center text-center p-6 text-slate-500'>
                  <FaMessage size={28} className='mb-2 text-slate-600' />
                  <p className='text-sm font-semibold text-slate-400'>No messages yet</p>
                  <p className='text-xs mt-1 text-slate-500'>Say hello to {activeChatFriend.name}!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === currentUser.id
                  const isReactionPickerOpen = openReactionMsgId === m.id

                  return (
                    <div
                      key={m.id}
                      className={`group relative flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >

                      <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-md ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>

                        <div
                          className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${
                            isMine
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                          }`}
                        >

                          {m.replyToText && (
                            <div className={`mb-2 p-2 rounded-lg text-[11px] border-l-2 bg-black/25 flex flex-col ${
                              isMine ? 'border-blue-200 text-blue-100' : 'border-blue-500 text-slate-300'
                            }`}>
                              <span className='font-bold text-[10px] opacity-80 flex items-center gap-1'>
                                <FaReply size={9} />
                                {m.replyToSenderName || 'Reply'}:
                              </span>
                              <span className='truncate italic mt-0.5'>{m.replyToText}</span>
                            </div>
                          )}

                          <div className='text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-pre-wrap'>
                            {m.text}
                          </div>

                          <div className={`flex items-center gap-1 mt-1 text-[9px] ${isMine ? 'text-blue-200/70 justify-end' : 'text-slate-400 justify-start'} font-mono`}>
                            <span>{formatMsgTime(m.createdAt)}</span>
                            {m.isEdited && <span className='italic font-sans opacity-80'>(edited)</span>}
                          </div>
                        </div>

                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 rounded-lg p-1 text-slate-400 shadow-lg flex-shrink-0 ${
                          isMine ? 'order-first' : 'order-last'
                        }`}>

                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenReactionMsgId(isReactionPickerOpen ? null : m.id)
                            }}
                            className='p-1.5 hover:text-amber-400 hover:bg-slate-700/80 rounded-md transition-colors'
                            title='React with emoji'
                          >
                            <FaFaceSmile size={12} />
                          </button>

                          <button
                            type='button'
                            onClick={() => startReply(m)}
                            className='p-1.5 hover:text-blue-400 hover:bg-slate-700/80 rounded-md transition-colors'
                            title='Reply to message'
                          >
                            <FaReply size={12} />
                          </button>

                          {isMine && (
                            <>
                              <button
                                type='button'
                                onClick={() => startEdit(m)}
                                className='p-1.5 hover:text-white hover:bg-slate-700/80 rounded-md transition-colors'
                                title='Edit message'
                              >
                                <FaPen size={11} />
                              </button>
                              <button
                                type='button'
                                onClick={() => handleDeleteMessage(m.id)}
                                className='p-1.5 hover:text-rose-400 hover:bg-slate-700/80 rounded-md transition-colors'
                                title='Delete message'
                              >
                                <FaTrash size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isReactionPickerOpen && (
                        <div
                          className={`mt-1.5 p-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 duration-100 ${
                            isMine ? 'self-end' : 'self-start'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {QUICK_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              type='button'
                              onClick={() => handleReactToMessage(m.id, emoji)}
                              className='p-1.5 hover:bg-slate-700 rounded-lg text-sm transition-transform hover:scale-125'
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(m.reactions).map(([emoji, userIds]) => {
                            if (!Array.isArray(userIds) || userIds.length === 0) return null
                            const hasReacted = currentUser && userIds.includes(currentUser.id)
                            return (
                              <button
                                key={emoji}
                                type='button'
                                onClick={() => handleReactToMessage(m.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
                                  hasReacted
                                    ? 'bg-blue-600/30 border-blue-500/70 text-blue-200'
                                    : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:border-slate-600'
                                }`}
                                title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                              >
                                <span>{emoji}</span>
                                <span className='text-[10px] font-bold font-mono'>{userIds.length}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyingTo && (
              <div className='px-4 py-2 bg-slate-900/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300'>
                <div className='flex items-center gap-2 truncate'>
                  <FaReply className='text-blue-400 flex-shrink-0' size={11} />
                  <span className='text-slate-400'>
                    Replying to <strong className='text-white'>{replyingTo.senderId === currentUser?.id ? 'yourself' : activeChatFriend.name}</strong>:
                  </span>
                  <span className='italic text-slate-300 truncate max-w-xs'>"{replyingTo.text}"</span>
                </div>
                <button
                  type='button'
                  onClick={() => setReplyingTo(null)}
                  className='p-1 text-slate-400 hover:text-white transition-colors'
                  title='Cancel reply'
                >
                  <FaXmark size={13} />
                </button>
              </div>
            )}

            {editingMessage && (
              <div className='px-4 py-2 bg-slate-900/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300'>
                <div className='flex items-center gap-2 truncate'>
                  <FaPen className='text-amber-400 flex-shrink-0' size={11} />
                  <span className='text-slate-400'>Editing message:</span>
                  <span className='italic text-slate-300 truncate max-w-xs'>"{editingMessage.text}"</span>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setEditingMessage(null)
                    setMessageInput('')
                  }}
                  className='p-1 text-slate-400 hover:text-white transition-colors'
                  title='Cancel edit'
                >
                  <FaXmark size={13} />
                </button>
              </div>
            )}

            {isFriendTyping && (
              <div className='flex items-center gap-2 px-4 py-1.5 bg-slate-900/60 border-t border-slate-700/60 text-xs text-blue-400 animate-in fade-in duration-150'>
                <div className='flex items-center gap-1'>
                  <span className='w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce' style={{ animationDelay: '0ms' }} />
                  <span className='w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce' style={{ animationDelay: '150ms' }} />
                  <span className='w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce' style={{ animationDelay: '300ms' }} />
                </div>
                <span className='text-[11px] font-medium text-slate-300'>{activeChatFriend.name} is typing...</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className='p-3 border-t border-slate-700 bg-slate-800 flex gap-2'>
              <input
                ref={chatInputRef}
                type='text'
                value={messageInput}
                onChange={handleInputChange}
                placeholder={editingMessage ? 'Edit your message...' : `Message ${activeChatFriend.name}...`}
                className='flex-1 bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors'
              />
              <button
                type='submit'
                disabled={!messageInput.trim() || isSendingMessage}
                className='px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-none'
              >
                {editingMessage ? (
                  <>
                    <FaCheck size={12} />
                    <span>Save</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane size={12} />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (

          <div>

            {activeTab === 'friends' && (
              <div className='space-y-4'>

                {friends.length > 0 && (
                  <div className='relative max-w-sm'>
                    <FaMagnifyingGlass className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs' />
                    <input
                      type='text'
                      value={friendFilterText}
                      onChange={e => setFriendFilterText(e.target.value)}
                      placeholder='Filter friends by name or email...'
                      className='w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500'
                    />
                  </div>
                )}

                {loading ? (
                  <div className='text-center py-16 text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse'>
                    Loading friends...
                  </div>
                ) : friends.length === 0 ? (
                  <div className='bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center space-y-4'>
                    <div className='w-16 h-16 bg-blue-600/15 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30'>
                      <FaUserGroup size={24} />
                    </div>
                    <div className='space-y-1 max-w-sm mx-auto'>
                      <h3 className='text-base font-bold text-white'>No friends yet</h3>
                      <p className='text-xs text-slate-400'>
                        Learning is more fun together! Find your friends by name or email and start practicing.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('search')}
                      className='px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2'
                    >
                      <FaMagnifyingGlass size={12} />
                      <span>Find Users</span>
                    </button>
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className='bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400 text-xs'>
                    No friends matched "{friendFilterText}"
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {filteredFriends.map(item => (
                      <div
                        key={item.friendshipId}
                        className='bg-slate-800 border border-slate-700 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all hover:border-slate-600'
                      >
                        <div className='flex items-start justify-between gap-3'>

                          <div
                            onClick={() => setInspectUser({ user: item.friend, stats: item.stats })}
                            className='flex items-center gap-3 min-w-0 cursor-pointer group'
                            title='Click to view statistics'
                          >
                            <div className='w-12 h-12 rounded-full bg-blue-600 border-2 border-slate-700 group-hover:border-blue-500 overflow-hidden flex items-center justify-center font-bold text-white text-base flex-shrink-0 transition-colors'>
                              {item.friend.avatarUrl ? (
                                <img src={item.friend.avatarUrl} alt={item.friend.name} className='w-full h-full object-cover' />
                              ) : (
                                item.friend.name ? item.friend.name[0].toUpperCase() : 'U'
                              )}
                            </div>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-2'>
                                <h3 className='text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate'>{item.friend.name}</h3>
                                {item.friend.streakCount > 0 && (
                                  <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded'>
                                    <FaFire size={9} /> {item.friend.streakCount}d
                                  </span>
                                )}
                              </div>
                              <div className='flex items-center gap-1.5 text-[10px] mt-0.5 text-slate-400'>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${onlineUserIds.has(item.friend.id) ? 'bg-blue-400' : 'bg-slate-600'}`} />
                                <span className={onlineUserIds.has(item.friend.id) ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
                                  {formatLastSeen(item.friend.lastSeen, onlineUserIds.has(item.friend.id))}
                                </span>
                                <span className='text-slate-600'>•</span>
                                <span className='truncate group-hover:text-slate-300 transition-colors'>{item.friend.email}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveFriend(item.friend.id, item.friend.name)}
                            className='text-slate-500 hover:text-rose-400 p-1.5 transition-colors rounded-lg hover:bg-slate-700/60'
                            title='Remove friend'
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>

                        <div className='pt-1 border-t border-slate-700/60'>
                          <button
                            onClick={() => {
                              setActiveChatFriend(item.friend)
                              setReplyingTo(null)
                              setEditingMessage(null)
                              setMessageInput('')
                            }}
                            className='w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2'
                          >
                            <FaMessage size={12} />
                            <span>Chat</span>
                            {item.unreadCount > 0 && (
                              <span className='px-1.5 py-0.5 bg-white text-blue-600 rounded-full text-[10px] font-black'>
                                {item.unreadCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className='space-y-6'>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-sm font-bold text-white uppercase tracking-wider'>
                      Incoming Requests ({requests.incoming.length})
                    </h2>
                  </div>

                  {requests.incoming.length === 0 ? (
                    <div className='bg-slate-800 rounded-xl border border-slate-700 p-6 text-center text-slate-400 text-xs'>
                      No incoming friend requests.
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {requests.incoming.map(req => (
                        <div
                          key={req.id}
                          className='bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3'
                        >
                          <div
                            onClick={() => openUserProfile(req.user)}
                            className='flex items-center gap-3 cursor-pointer group'
                            title='Click to view statistics'
                          >
                            <div className='w-11 h-11 rounded-full bg-blue-600 border border-slate-600 group-hover:border-blue-500 overflow-hidden flex items-center justify-center font-bold text-white text-sm flex-shrink-0 transition-colors'>
                              {req.user.avatarUrl ? (
                                <img src={req.user.avatarUrl} alt={req.user.name} className='w-full h-full object-cover' />
                              ) : (
                                req.user.name ? req.user.name[0].toUpperCase() : 'U'
                              )}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-center gap-2'>
                                <h3 className='text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate'>{req.user.name}</h3>
                                {req.user.streakCount > 0 && (
                                  <span className='inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded'>
                                    <FaFire size={8} /> {req.user.streakCount}d
                                  </span>
                                )}
                              </div>
                              <p className='text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors truncate'>{req.user.email}</p>
                            </div>
                          </div>

                          <div className='flex gap-2 pt-1 border-t border-slate-700/60'>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              className='flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5'
                            >
                              <FaCheck size={11} />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              className='px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5'
                            >
                              <FaXmark size={11} />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='space-y-3 pt-2 border-t border-slate-800'>
                  <h2 className='text-sm font-bold text-white uppercase tracking-wider'>
                    Sent Requests ({requests.outgoing.length})
                  </h2>

                  {requests.outgoing.length === 0 ? (
                    <div className='bg-slate-800 rounded-xl border border-slate-700 p-6 text-center text-slate-400 text-xs'>
                      No pending outgoing friend requests.
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {requests.outgoing.map(req => (
                        <div
                          key={req.id}
                          className='bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-3'
                        >
                          <div
                            onClick={() => openUserProfile(req.user)}
                            className='flex items-center gap-3 min-w-0 cursor-pointer group'
                            title='Click to view statistics'
                          >
                            <div className='w-10 h-10 rounded-full bg-blue-600 border border-slate-600 group-hover:border-blue-500 overflow-hidden flex items-center justify-center font-bold text-white text-xs flex-shrink-0 transition-colors'>
                              {req.user.avatarUrl ? (
                                <img src={req.user.avatarUrl} alt={req.user.name} className='w-full h-full object-cover' />
                              ) : (
                                req.user.name ? req.user.name[0].toUpperCase() : 'U'
                              )}
                            </div>
                            <div className='min-w-0'>
                              <h3 className='text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate'>{req.user.name}</h3>
                              <p className='text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors truncate'>{req.user.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className='px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap'
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className='space-y-4'>
                <div className='relative'>
                  <FaMagnifyingGlass className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm' />
                  <input
                    type='text'
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='Search users by name or email address...'
                    className='w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors'
                  />
                  {isSearching && (
                    <span className='absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 animate-pulse'>
                      Searching...
                    </span>
                  )}
                </div>

                {!searchQuery.trim() ? (
                  <div className='bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center space-y-3'>
                    <div className='w-14 h-14 bg-blue-600/15 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30'>
                      <FaMagnifyingGlass size={20} />
                    </div>
                    <div className='space-y-1 max-w-sm mx-auto'>
                      <h3 className='text-base font-bold text-white'>Search for other learners</h3>
                      <p className='text-xs text-slate-400'>
                        Type a name or email in the box above to find other members and send them friend requests.
                      </p>
                    </div>
                  </div>
                ) : searchResults.length === 0 && !isSearching ? (
                  <div className='bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400 text-xs'>
                    No users found matching "{searchQuery}"
                  </div>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    {searchResults.map(userItem => (
                      <div
                        key={userItem.id}
                        className='bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all hover:border-slate-600'
                      >
                        <div className='flex items-start justify-between gap-3'>

                          <div
                            onClick={() => setInspectUser({ user: userItem, stats: userItem.stats })}
                            className='flex items-center gap-3 min-w-0 cursor-pointer group'
                            title='Click to view statistics'
                          >
                            <div className='w-11 h-11 rounded-full bg-blue-600 border border-slate-600 group-hover:border-blue-500 overflow-hidden flex items-center justify-center font-bold text-white text-sm flex-shrink-0 transition-colors'>
                              {userItem.avatarUrl ? (
                                <img src={userItem.avatarUrl} alt={userItem.name} className='w-full h-full object-cover' />
                              ) : (
                                userItem.name ? userItem.name[0].toUpperCase() : 'U'
                              )}
                            </div>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-2'>
                                <h3 className='text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate'>{userItem.name}</h3>
                                {userItem.streakCount > 0 && (
                                  <span className='inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded'>
                                    <FaFire size={9} /> {userItem.streakCount}d
                                  </span>
                                )}
                              </div>
                              <p className='text-xs text-slate-400 group-hover:text-slate-300 transition-colors truncate'>{userItem.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className='pt-1 border-t border-slate-700/60'>
                          {userItem.relationship === 'FRIENDS' ? (
                            <div className='flex gap-2'>
                              <span className='flex-1 py-2 bg-slate-700/60 text-slate-300 rounded-lg text-xs font-semibold text-center'>
                                Already Friends
                              </span>
                              <button
                                onClick={() => {
                                  setActiveChatFriend(userItem)
                                  setReplyingTo(null)
                                  setEditingMessage(null)
                                  setMessageInput('')
                                }}
                                className='px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5'
                              >
                                <FaMessage size={11} /> Chat
                              </button>
                            </div>
                          ) : userItem.relationship === 'REQUEST_SENT' ? (
                            <span className='block w-full py-2 bg-slate-700/50 text-slate-400 rounded-lg text-xs font-semibold text-center'>
                              Friend Request Sent
                            </span>
                          ) : userItem.relationship === 'REQUEST_RECEIVED' ? (
                            <div className='flex gap-2'>
                              <button
                                onClick={() => userItem.requestId && handleAcceptRequest(userItem.requestId)}
                                className='flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors'
                              >
                                Accept Request
                              </button>
                              <button
                                onClick={() => userItem.requestId && handleDeclineRequest(userItem.requestId)}
                                className='px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors'
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <div className='flex gap-2'>
                              <button
                                onClick={() => handleSendRequest(userItem.id)}
                                className='flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5'
                              >
                                <FaUserPlus size={12} />
                                <span>Add Friend</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveChatFriend(userItem)
                                  setReplyingTo(null)
                                  setEditingMessage(null)
                                  setMessageInput('')
                                }}
                                className='px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5'
                                title='Send direct message'
                              >
                                <FaMessage size={11} />
                                <span>Message</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {inspectUser && (
          <div
            className='fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4'
            onClick={() => setInspectUser(null)}
          >
            <div
              className='bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 w-full max-w-md space-y-6 shadow-2xl relative'
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setInspectUser(null)}
                className='absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors'
              >
                <FaXmark size={16} />
              </button>

              <div className='text-center space-y-3 pt-2'>
                <div className='w-20 h-20 rounded-full bg-blue-600 border-4 border-slate-700 overflow-hidden mx-auto flex items-center justify-center font-black text-white text-2xl shadow-xl'>
                  {inspectUser.user.avatarUrl ? (
                    <img src={inspectUser.user.avatarUrl} alt={inspectUser.user.name} className='w-full h-full object-cover' />
                  ) : (
                    inspectUser.user.name ? inspectUser.user.name[0].toUpperCase() : 'U'
                  )}
                </div>
                <div>
                  <h3 className='text-xl font-bold text-white'>{inspectUser.user.name}</h3>
                  <p className='text-xs text-slate-400 mt-0.5'>{inspectUser.user.email}</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60 text-center'>
                  <div className='w-7 h-7 mx-auto bg-slate-800 text-orange-400 rounded-lg flex items-center justify-center border border-slate-700 mb-1.5'>
                    <FaFire size={14} />
                  </div>
                  <div className='text-lg font-black text-white font-mono'>{inspectUser.user.streakCount}</div>
                  <div className='text-[10px] text-slate-400 uppercase font-bold mt-0.5'>Day Streak</div>
                </div>

                <div className='bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60 text-center'>
                  <div className='w-7 h-7 mx-auto bg-slate-800 text-blue-400 rounded-lg flex items-center justify-center border border-slate-700 mb-1.5'>
                    <FaBook size={13} />
                  </div>
                  <div className='text-lg font-black text-white font-mono'>{inspectUser.stats.totalDictionaries}</div>
                  <div className='text-[10px] text-slate-400 uppercase font-bold mt-0.5'>Dictionaries</div>
                </div>

                <div className='bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60 text-center'>
                  <div className='w-7 h-7 mx-auto bg-slate-800 text-slate-300 rounded-lg flex items-center justify-center border border-slate-700 mb-1.5'>
                    <FaBolt size={13} />
                  </div>
                  <div className='text-lg font-black text-white font-mono'>{inspectUser.stats.totalWords}</div>
                  <div className='text-[10px] text-slate-400 uppercase font-bold mt-0.5'>Total Words</div>
                </div>

                <div className='bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60 text-center'>
                  <div className='w-7 h-7 mx-auto bg-slate-800 text-blue-400 rounded-lg flex items-center justify-center border border-slate-700 mb-1.5'>
                    <FaGraduationCap size={13} />
                  </div>
                  <div className='text-lg font-black text-white font-mono'>{inspectUser.stats.learnedWords}</div>
                  <div className='text-[10px] text-slate-400 uppercase font-bold mt-0.5'>Learned Words</div>
                </div>
              </div>

              <div className='space-y-1.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/60'>
                <div className='flex justify-between text-xs font-semibold'>
                  <span className='text-slate-400'>Mastery Rate</span>
                  <span className='text-blue-400 font-mono'>
                    {inspectUser.stats.totalWords > 0
                      ? Math.round((inspectUser.stats.learnedWords / inspectUser.stats.totalWords) * 100)
                      : 0}%
                  </span>
                </div>
                <div className='w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700'>
                  <div
                    className='h-full bg-blue-600 rounded-full transition-all'
                    style={{
                      width: `${inspectUser.stats.totalWords > 0 ? Math.min(100, Math.round((inspectUser.stats.learnedWords / inspectUser.stats.totalWords) * 100)) : 0}%`
                    }}
                  />
                </div>
              </div>

              <div className='pt-2 flex gap-3'>
                <button
                  onClick={() => {
                    const target = inspectUser.user
                    setInspectUser(null)
                    setActiveChatFriend(target)
                    setReplyingTo(null)
                    setEditingMessage(null)
                    setMessageInput('')
                  }}
                  className='flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2'
                >
                  <FaMessage size={13} />
                  <span>Send Message</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Friends
