import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaBook, FaUserGroup, FaUser, FaHouse, FaBell, FaChevronUp, FaChevronDown, FaBars } from 'react-icons/fa6'
import { getSessionUser } from '../services/api'
import { getNotificationSettings } from '../services/notificationSettings'

function NavigBar() {

  const [isBurgerOpen, setIsBurgerOpen] = useState(true)
  const [notifSettings, setNotifSettings] = useState(getNotificationSettings)
  const location = useLocation()
  const user = getSessionUser()
  const practicedToday = user?.lastPracticeDate
    ? new Date(user.lastPracticeDate).toDateString() === new Date().toDateString()
    : false

  useEffect(() => {
    const handleSettingsChange = () => setNotifSettings(getNotificationSettings())
    window.addEventListener('notification-settings-changed', handleSettingsChange)
    window.addEventListener('storage', handleSettingsChange)
    return () => {
      window.removeEventListener('notification-settings-changed', handleSettingsChange)
      window.removeEventListener('storage', handleSettingsChange)
    }
  }, [])

  const isLastHourOfDay = new Date().getHours() >= 23
  const hasStreakWarning = Boolean(user) && !practicedToday && isLastHourOfDay && notifSettings.enabled && notifSettings.streakAlerts

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const handleMobileClick = () => {

  }

  const linkStyle = (path: string) => {
    const active = isActive(path)
    return `flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 group no-underline transition-all duration-200 w-full md:w-fit rounded-lg
    ${isBurgerOpen ? 'md:origin-left px-1 py-1.5 md:px-4 md:py-2' : 'md:origin-center p-1.5 md:p-3'}
    ${active
      ? 'bg-slate-800 text-blue-400 md:text-white md:shadow-lg scale-105'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
    `;
  };

  const textStyle = `hidden md:block text-[10px] md:text-xs lg:text-[0.9rem] uppercase font-bold tracking-wider transition-all overflow-hidden whitespace-nowrap ${isBurgerOpen ? 'opacity-100 max-w-xs ml-4 duration-500 delay-100' : 'opacity-0 max-w-0 ml-0 duration-0'}`;

  return (
    <>
    <nav className={`fixed bottom-0 md:left-0 md:top-0 left-0 right-0 h-auto md:h-full ${isBurgerOpen ? 'md:w-[15.2%] translate-y-0' : 'md:w-[5%] max-md:translate-y-[calc(100%-12px)]'} w-full bg-slate-900 md:border-r-2 border-slate-800 grid grid-cols-5 md:flex md:flex-col items-center md:items-start md:justify-start py-2.5 md:py-8 px-1 md:px-[1.5%] transition-all duration-300 z-50 border-t-2 border-slate-800 md:border-t-0 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]`}>

      <div
        onClick={() => setIsBurgerOpen(!isBurgerOpen)}
        className="md:hidden absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-6 bg-slate-900 border-t-2 border-x-2 border-slate-800 rounded-t-xl flex items-center justify-center cursor-pointer text-slate-400 hover:text-white"
        title={isBurgerOpen ? 'Collapse bar' : 'Expand bar'}
      >
        {isBurgerOpen ? <FaChevronDown size={11} /> : <FaChevronUp size={11} />}
      </div>

      <div className={`hidden md:flex flex-col w-full mb-10 gap-6 ${isBurgerOpen ? 'items-start pl-2' : 'items-center'}`}>
        <button
          onClick={() => setIsBurgerOpen(!isBurgerOpen)}
          className="flex items-center text-slate-500 hover:text-white transition-colors"
        >
          <div className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-all duration-300">
            <FaBars size={20} />
          </div>
        </button>
      </div>

      <div className={`order-1 md:order-none flex justify-center md:w-full md:py-3.5 ${isBurgerOpen ? 'md:justify-start' : 'md:justify-center'}`}>
        <Link to='/' className={linkStyle("/")} onClick={handleMobileClick}>
          <FaHouse className='text-lg md:text-[145%]' />
          <p className={textStyle}>Home</p>
          <p className='md:hidden text-[9px] uppercase font-bold tracking-wider'>Home</p>
        </Link>
      </div>

      <div className={`order-2 md:order-none flex justify-center md:w-full md:py-3.5 ${isBurgerOpen ? 'md:justify-start' : 'md:justify-center'}`}>
        <Link to='/notifications' className={linkStyle('/notifications')} onClick={handleMobileClick}>
          <div className='relative flex items-center justify-center'>
            <FaBell className='text-lg md:text-[145%]' />
            {hasStreakWarning && (
              <span className='absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-slate-900'></span>
            )}
          </div>
          <p className={textStyle}>Notifications</p>
          <p className='md:hidden text-[9px] uppercase font-bold tracking-wider'>Alerts</p>
        </Link>
      </div>

      <div className={`order-4 md:order-none flex justify-center md:w-full md:py-3.5 ${isBurgerOpen ? 'md:justify-start' : 'md:justify-center'}`}>
        <Link to='/friends' className={linkStyle('/friends')} onClick={handleMobileClick}>
          <FaUserGroup className='text-lg md:text-[145%]' />
          <p className={textStyle}>Friends</p>
          <p className='md:hidden text-[9px] uppercase font-bold tracking-wider'>Friends</p>
        </Link>
      </div>

      <hr className={`hidden md:block transition-all duration-300 ${isBurgerOpen ? 'w-full' : 'w-8'} border-t-2 border-slate-700 my-2 mx-auto`} />

      <div className={`order-3 md:order-none flex justify-center md:w-full md:py-4 ${isBurgerOpen ? 'md:justify-start' : 'md:justify-center'}`}>
        <Link to='/mainDictionary' className={linkStyle('/mainDictionary')} onClick={handleMobileClick}>
          <FaBook className='text-lg md:text-[145%]' />
          <p className={`${textStyle} leading-tight`}>
            Your <br /> Dictionaries
          </p>
          <p className='md:hidden text-[9px] uppercase font-bold tracking-wider'>Dicts</p>
        </Link>
      </div>

      <hr className={`hidden md:block transition-all duration-300 ${isBurgerOpen ? 'w-full' : 'w-8'} border-t-2 border-slate-700 my-2 mx-auto`} />

      <div className={`order-5 md:order-none flex justify-center md:w-full md:py-4 ${isBurgerOpen ? 'md:justify-start' : 'md:justify-center'}`}>
        <Link to='/account' className={linkStyle('/account')} onClick={handleMobileClick}>
          <div className='relative flex items-center justify-center'>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border border-slate-600"
              />
            ) : (
              <FaUser className='text-lg md:text-[145%]' />
            )}
          </div>
          <p className={textStyle}>Account</p>
          <p className='md:hidden text-[9px] uppercase font-bold tracking-wider'>User</p>
        </Link>
      </div>

    </nav>
    </>
  )
}

export default NavigBar;
