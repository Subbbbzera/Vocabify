import React, { useState, useEffect, useRef } from 'react'
import { FaXmark, FaCheck, FaArrowRight, FaVolumeHigh } from 'react-icons/fa6'
import type { AllWord } from '../../types'
import { api } from '../../services/api'

interface PracticeOverlayProps {
  words: AllWord[]
  onClose: () => void
}

const PracticeOverlay: React.FC<PracticeOverlayProps> = ({ words, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserValue] = useState('')
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [shuffledWords, setShuffledWords] = useState<AllWord[]>([])
  const [sessionComplete, setSessionComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setShuffledWords([...words].sort(() => Math.random() - 0.5))
  }, [words])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [currentIndex, sessionComplete])

  const currentWord = shuffledWords[currentIndex]

  const handleCheck = () => {
    if (!currentWord || isChecked) return

    const normalizedInput = userInput.trim().toLowerCase()
    const normalizedCorrect = currentWord.text.trim().toLowerCase()

    const correct = normalizedInput === normalizedCorrect
    setIsCorrect(correct)
    setIsChecked(true)

    if (correct) {

      api.patch(`/words/${currentWord.id}`, { remembered: true })
        .catch((err) => console.error('Failed to update word status:', err));

      setTimeout(() => {
        handleNext()
      }, 1000)
    }
  }

  const handleNext = () => {
    if (currentIndex < shuffledWords.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setUserValue('')
      setIsChecked(false)
      setIsCorrect(false)
    } else {
      setSessionComplete(true)
    }
  }

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);

    window.speechSynthesis.speak(utterance);
  }

  if (sessionComplete) {
    return (
      <div className='fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-6'>
        <div className='bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-sm w-full'>
           <div className='w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-6'>
              <FaCheck size={40} />
           </div>
           <h2 className='text-3xl font-black text-white mb-2 uppercase tracking-tighter'>Session Complete!</h2>
           <p className='text-slate-400 mb-8'>You've practiced {shuffledWords.length} words.</p>
           <button
             onClick={onClose}
             className='w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl transition-all uppercase tracking-widest'
           >
             Finish
           </button>
        </div>
      </div>
    )
  }

  if (!currentWord) return null

  return (
    <div className='fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-4 md:p-8'>
      <button
        onClick={onClose}
        className='absolute top-6 right-6 p-4 text-slate-500 hover:text-white transition-colors'
      >
        <FaXmark size={32} />
      </button>

      <div className='w-full max-w-lg'>

        <div className='mb-12'>
           <div className='flex justify-between items-end mb-2'>
              <span className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>Progress</span>
              <span className='text-sm font-black text-sky-400'>{currentIndex + 1} / {shuffledWords.length}</span>
           </div>
           <div className='w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700'>
              <div
                className='bg-sky-500 h-full transition-all duration-500'
                style={{ width: `${((currentIndex + 1) / shuffledWords.length) * 100}%` }}
              ></div>
           </div>
        </div>

        <div className={`bg-slate-800 border-2 p-8 md:p-12 rounded-[2rem] shadow-2xl transition-all duration-300 ${isChecked ? (isCorrect ? 'border-emerald-500 shadow-emerald-500/10' : 'border-rose-500 shadow-rose-500/10') : 'border-slate-700'}`}>
          <div className='text-center mb-10'>
            <p className='text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4'>Translate this:</p>
            <h2 className='text-4xl md:text-5xl font-black text-white tracking-tight leading-tight'>
              {currentWord.translate}
            </h2>
          </div>

          <div className='relative'>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (isChecked ? handleNext() : handleCheck())}
              placeholder="Type in English..."
              disabled={isChecked && isCorrect}
              className={`w-full bg-slate-900/50 border-2 rounded-2xl px-6 py-5 text-xl text-center text-white outline-none transition-all ${isChecked ? (isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5') : 'border-slate-700 focus:border-sky-500'}`}
            />

            {isChecked && !isCorrect && (
              <div className='mt-6 text-center animate-in fade-in slide-in-from-top-2'>
                 <p className='text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1'>Correct answer:</p>
                 <div className='flex items-center justify-center gap-3'>
                    <span className='text-2xl font-bold text-white'>{currentWord.text}</span>
                    <button onClick={() => speak(currentWord.text)} className='text-sky-400 hover:text-sky-300'>
                       <FaVolumeHigh size={18}/>
                    </button>
                 </div>
              </div>
            )}
          </div>

          <button
            onClick={isChecked ? handleNext : handleCheck}
            className={`w-full mt-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isChecked ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600') : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'}`}
          >
            {isChecked ? (isCorrect ? <><FaCheck /> Correct</> : <><FaArrowRight /> Next</>) : 'Check'}
          </button>
        </div>

        {!isChecked && (
          <p className='text-center mt-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest'>
             Press Enter to check
          </p>
        )}
      </div>
    </div>
  )
}

export default PracticeOverlay
