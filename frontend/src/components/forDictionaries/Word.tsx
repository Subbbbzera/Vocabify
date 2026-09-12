import React, { useState, useEffect, useRef } from 'react'
import { FaTrash } from 'react-icons/fa6'
import { FaEdit } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

export type WordProp = {
  id: number
  text: string
  translate: string
  extraForms?: string[]
  hideMode?: 'none' | 'text' | 'translate'
  onEdit?: () => void
  onDelete?: () => void
  fontSize?: number
  wordMargin?: number
  wordPaddingY?: number
  remembered?: boolean
  showStatus?: boolean
}

const Word = React.memo(({id, text, translate, extraForms, hideMode = 'none', onEdit, onDelete, fontSize = 18, wordMargin = 12, wordPaddingY = 16, remembered = false, showStatus = true} : WordProp) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const navigate = useNavigate();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    setIsRevealed(false);
    setShowExtras(false);
    setShowMenu(false);
  }, [hideMode]);

  const displayTranslate = (hideMode === 'translate' && !isRevealed) ? '???' : translate;
  const displayText = (hideMode === 'text' && !isRevealed) ? '???' : text;

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isLongPress.current = false;

    if ('touches' in e) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setShowMenu(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
  };

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!timerRef.current) return;

    if ('touches' in e && touchStartPos.current) {
      const moveX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const moveY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (moveX > 10 || moveY > 10) {
        handleEnd();
      }
    }
  };

  const handleTextClick = (e: React.MouseEvent) => {
    if (showMenu) {
      setShowMenu(false);
      return;
    }

    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (hideMode === 'none') {
      setShowExtras(!showExtras);
    } else {
      setIsRevealed(!isRevealed);
    }
  }

  const handleTranslateClick = (e: React.MouseEvent) => {
    if (showMenu) {
      setShowMenu(false);
      return;
    }

    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (hideMode !== 'none') {
      setIsRevealed(!isRevealed);
    } else {
      navigate(`/WordDetails/${id}`);
    }
  }

  useEffect(() => {
    const handleGlobalClick = () => {
      if (showMenu) setShowMenu(false);
    };

    if (showMenu) {
      window.addEventListener('click', handleGlobalClick);
    }

    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [showMenu]);

  const renderColoredText = (fullText: string, baseClass: string, isOriginal: boolean) => {
    if (!showStatus || fullText === '???' || !isOriginal) return fullText;

    const firstChar = fullText.charAt(0);
    const rest = fullText.slice(1);
    const statusColor = remembered ? 'text-emerald-400' : 'text-rose-500';

    return (
      <span className={baseClass}>
        <span className={`${statusColor} font-black drop-shadow-[0_0_8px_currentColor]`}>{firstChar}</span>
        {rest}
      </span>
    );
  };

  return (
    <div
      className='w-full px-4 md:px-0 relative select-none group'
      style={{ marginBottom: `${wordMargin}px` }}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleMove}
      onContextMenu={(e) => {
        if (isLongPress.current || showMenu) {
          e.preventDefault();
        }
      }}
    >

      <div className={`absolute right-0 inset-y-0 flex flex-col justify-center gap-3 px-4 transition-all duration-300 ${showMenu ? 'opacity-100 visible translate-x-0' : 'opacity-0 invisible translate-x-2 pointer-events-none'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); setShowMenu(false); }}
          className='text-sky-400 hover:text-sky-300 transition-all hover:scale-110 active:scale-95'
        >
          <FaEdit style={{ fontSize: `${fontSize * 1.1}px` }} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(); setShowMenu(false); }}
          className='text-rose-500 hover:text-rose-400 transition-all hover:scale-110 active:scale-95'
        >
          <FaTrash style={{ fontSize: `${fontSize * 1.1}px` }} />
        </button>
      </div>

      <div
        className={`flex items-center justify-between bg-slate-800/60 border border-slate-700/50 px-4 rounded-xl hover:bg-slate-700/80 transition-all duration-300 shadow-lg shadow-black/20 cursor-pointer ${showMenu ? 'mr-10 md:mr-12' : 'mr-0'}`}
        style={{ paddingTop: `${wordPaddingY}px`, paddingBottom: `${wordPaddingY}px` }}
      >
        <div className='flex-1 text-left' onClick={handleTextClick}>
          <p
            className={`text-white font-bold tracking-wide transition-all ${hideMode === 'text' && !isRevealed ? 'opacity-40 scale-95' : 'opacity-100'}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {renderColoredText(displayText, '', true)}
          </p>
        </div>

        <div className='px-4 md:px-6 text-slate-500/50 font-light' style={{ fontSize: `${fontSize * 1.2}px` }}>
          -
        </div>

        <div className='flex-1 text-right' onClick={handleTranslateClick}>
          <p
            className={`text-slate-400 font-medium tracking-wide transition-all ${hideMode === 'translate' && !isRevealed ? 'opacity-40 scale-95' : 'opacity-100'}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {renderColoredText(displayTranslate, '', false)}
          </p>
        </div>
      </div>

      {hideMode === 'none' && extraForms && extraForms.length > 0 && (
        <div className={`grid transition-all duration-300 ease-in-out ${showExtras ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'} ${showMenu ? 'mr-10 md:mr-12' : 'mr-0'}`}>
          <div className="overflow-hidden flex flex-col items-start gap-2 pl-4">
            {extraForms.map((form, i) => (
              <div key={i} className="bg-slate-700/40 border border-slate-600/30 px-4 py-1.5 rounded-lg shadow-inner min-w-[120px] text-left">
                 <p className="text-white text-sm md:text-base font-medium italic opacity-80">
                  {form}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default Word
