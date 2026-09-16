import { FaRightFromBracket, FaGear } from 'react-icons/fa6'
import type { User } from '../types'
import { useNavigate } from 'react-router-dom'

interface ProfileDropdownProps {
  user: User;
  onLogout: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function ProfileDropdown({ user, onLogout, onClose, onMouseEnter, onMouseLeave }: ProfileDropdownProps) {
  const navigate = useNavigate();

  return (
    <div
      className="absolute top-full right-0 mt-3 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-[110] animate-in fade-in slide-in-from-top-2 duration-200"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700/50">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden border-2 border-slate-700 flex-shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name ? user.name[0].toUpperCase() : 'U'
          )}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-bold text-white truncate">{user.name}</span>
          <span className="text-[10px] text-slate-500 font-bold truncate">{user.email}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => { navigate('/account'); onClose(); }}
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-xs font-bold uppercase tracking-wider group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-500 flex items-center justify-center transition-colors">
            <FaGear className="text-slate-200" />
          </div>
          Profile Settings
        </button>

        <button
          onClick={() => { onLogout(); onClose(); }}
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-900/40 text-slate-200 hover:text-red-400 transition-all text-xs font-bold uppercase tracking-wider group"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-500 group-hover:bg-red-900/50 flex items-center justify-center transition-colors">
            <FaRightFromBracket className="text-slate-200 group-hover:text-red-400" />
          </div>
          Log Out
        </button>
      </div>
    </div>
  )
}

export default ProfileDropdown;

