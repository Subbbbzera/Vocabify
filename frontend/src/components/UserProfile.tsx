import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUser } from 'react-icons/fa6'
import type { User } from '../types'
import ProfileDropdown from './ProfileDropdown'
import { api, getToken, getSessionUser, clearSession } from '../services/api'

function UserProfile() {
  const [user, setUser] = useState<User | null>(() => getSessionUser())
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkUser = () => {
    const saved = localStorage.getItem('sessionUser');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }

  useEffect(() => {
    checkUser();
    if (getToken()) {
      api.get<User>('/auth/profile')
        .then((freshUser) => {
          if (freshUser) {
            setUser((prev) => (prev ? { ...prev, ...freshUser } : freshUser));
            const cached = getSessionUser();
            if (cached) {
              localStorage.setItem('sessionUser', JSON.stringify({ ...cached, ...freshUser }));
            }
          }
        })
        .catch(() => {});
    }

    window.addEventListener('storage', checkUser);
    const interval = setInterval(checkUser, 1000);
    return () => {
      window.removeEventListener('storage', checkUser);
      clearInterval(interval);
    }
  }, [])

  const handleMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setShowDropdown(true);
  }

  const handleMouseLeave = () => {
    // Small delay so cursor can travel from avatar to dropdown without closing
    hideTimeout.current = setTimeout(() => setShowDropdown(false), 150);
  }

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setShowDropdown(false);
    navigate('/account', { state: { openRegister: true } });
  }

  if (!user) return null;

  return (
    <div
      className="hidden md:flex fixed top-6 right-8 z-[100] items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        onClick={() => navigate('/account')}
        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-xl transition-all cursor-pointer relative overflow-hidden border-2 border-slate-700 ${user ? 'bg-blue-600' : 'bg-slate-700'} hover:scale-105 active:scale-95`}
      >
        {user.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={user.name || 'User'} 
            className="w-full h-full object-cover" 
          />
        ) : (
          user.name ? user.name[0].toUpperCase() : <FaUser size={20}/>
        )}
      </div>

      {showDropdown && (
        <ProfileDropdown 
          user={user} 
          onLogout={handleLogout} 
          onClose={() => setShowDropdown(false)} 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  )
}

export default UserProfile;
