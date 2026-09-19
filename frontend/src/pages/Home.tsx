import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

function Home() {
  // Simple fake counter that increments occasionally for the "live" effect
  const [wordsLearned, setWordsLearned] = useState(1247)
  const [activeUsers, setActiveUsers] = useState(42)

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setWordsLearned(prev => prev + Math.floor(Math.random() * 3) + 1)
      }
      if (Math.random() > 0.8) {
        setActiveUsers(prev => prev + (Math.random() > 0.5 ? 1 : -1))
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='min-h-screen md:ml-60 bg-slate-900 text-slate-200 px-6 py-12 pb-24 sm:px-12 sm:py-20 lg:px-20 overflow-hidden relative'>
      {/* Background ambient light */}
      <div className='absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none -z-10'></div>

      <div className='max-w-6xl mx-auto space-y-24 lg:space-y-32'>
        
        {/* HERO SECTION */}
        <div className='flex flex-col lg:flex-row items-center gap-16 lg:gap-24 w-full'>
          
          {/* Left: Dictionary Entry */}
          <div className='flex-1 space-y-8 text-left z-10'>
            <div className='space-y-3'>
              <h1 className='text-6xl sm:text-7xl lg:text-8xl font-serif font-black text-white tracking-tight'>
                Vocabify
              </h1>
              <div className='flex flex-wrap items-center gap-4 text-xl sm:text-2xl text-blue-400 font-serif'>
                <span className='tracking-wide opacity-90'>/vəˈkæbifai/</span>
                <span className='italic text-slate-400 opacity-80'>• noun</span>
              </div>
            </div>
            
            <div className='text-lg sm:text-xl text-slate-300 font-serif leading-relaxed pl-5 border-l-2 border-blue-500/40 space-y-3'>
              <p>
                <span className='italic font-semibold text-white'>1.</span> the body of words used in a particular language.
              </p>
              <p>
                <span className='italic font-semibold text-white'>2.</span> a system to master words permanently without forgetting them.
              </p>
            </div>

            <div className='pt-6 flex flex-row gap-2 sm:gap-4 font-sans'>
              <Link to='/mainDictionary' className='flex-1 px-2 sm:px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm sm:text-base rounded-xl transition-all text-center flex items-center justify-center gap-2'>
                Open Dictionaries
              </Link>
              <Link to='/practice' className='flex-1 px-2 sm:px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium text-sm sm:text-base rounded-xl transition-all text-center flex items-center justify-center gap-2'>
                Start Practice
              </Link>
            </div>
          </div>

          {/* Right: Live Flashcard Demo */}
          <div className='flex-1 w-full max-w-md perspective-1000 relative'>
            {/* Stack cards */}
            <div className='absolute inset-0 bg-slate-800 border border-slate-700 rounded-2xl rotate-6 opacity-40 shadow-sm'></div>
            <div className='absolute inset-0 bg-slate-800 border border-slate-700 rounded-2xl -rotate-3 opacity-60 shadow-md'></div>
            
            {/* Flipping card */}
            <div className='relative w-full aspect-[4/3] preserve-3d animate-flip-slow rounded-2xl cursor-default'>
              
              {/* Front */}
              <div className='absolute inset-0 backface-hidden bg-slate-800 border border-slate-700 rounded-2xl flex flex-col items-center justify-center p-8 shadow-2xl'>
                 <span className='absolute top-6 left-6 text-sm font-medium text-slate-500 font-sans'>Question</span>
                 <h3 className='text-4xl sm:text-5xl font-bold text-white font-serif'>Perseverance</h3>
                 <p className='absolute bottom-6 text-sm text-slate-500 italic font-serif opacity-70'>Flipping in real-time...</p>
              </div>

              {/* Back */}
              <div className='absolute inset-0 backface-hidden bg-slate-900 border border-blue-500/50 rounded-2xl flex flex-col items-center justify-center p-8 shadow-2xl rotate-y-180'>
                 <div className='absolute inset-0 bg-blue-500/5 rounded-2xl'></div>
                 <span className='absolute top-6 left-6 text-sm font-medium text-blue-400 font-sans'>Translation</span>
                 <h3 className='text-4xl sm:text-5xl font-bold text-white font-serif text-center relative z-10'>Perseverancia</h3>
                 <div className='mt-8 flex gap-2 font-sans relative z-10'>
                   <span className='px-3 py-1 bg-slate-800 rounded-md text-sm text-slate-300 border border-slate-700'>noun</span>
                   <span className='px-3 py-1 bg-slate-800 rounded-md text-sm text-slate-300 border border-slate-700'>C1</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* ASYMMETRICAL FEATURE SECTION 1 */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center pt-8'>
          
          {/* Left side: Mini-demo writing */}
          <div className='lg:col-span-7 bg-slate-800/40 p-6 sm:p-10 rounded-[2rem] border border-slate-700/50 relative overflow-hidden'>
            <div className='mb-8'>
              <h3 className='text-3xl font-serif text-white mb-3'>Active recall</h3>
              <p className='text-slate-400 text-lg leading-relaxed max-w-lg'>
                Don't just read translations. Force your brain to retrieve the word from memory to build neural pathways that last.
              </p>
            </div>
            
            <div className='bg-slate-900/90 border border-slate-700 rounded-2xl p-8 shadow-2xl relative w-full max-w-md'>
               <span className='text-sm text-slate-500 mb-6 block font-sans'>Type the translation:</span>
               <div className='text-3xl text-white font-serif mb-8 text-center tracking-wide'>Inevitably</div>
               <div className='relative'>
                 <input 
                    type='text' 
                    disabled 
                    placeholder="Type 'inevitablemente'..." 
                    className='w-full bg-slate-800 border border-slate-600 rounded-xl py-4 px-5 text-white text-center font-medium opacity-80 shadow-inner' 
                 />
                 <div className='absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center'>
                    <div className='w-2 h-2 rounded-full bg-blue-500 animate-pulse'></div>
                 </div>
               </div>
            </div>
          </div>

          {/* Right side: Live counter */}
          <div className='lg:col-span-5 flex flex-col justify-center space-y-10 lg:pl-8'>
            <div>
              <h3 className='text-3xl font-serif text-white mb-4'>Join the momentum</h3>
              <p className='text-slate-400 leading-relaxed text-lg'>
                Consistent daily practice builds a vocabulary that stays with you forever. See what others are achieving right now.
              </p>
            </div>
            
            <div className='flex items-end gap-5 border-b border-slate-700/50 pb-8'>
              <div className='text-6xl lg:text-7xl font-light text-blue-400 tabular-nums tracking-tighter'>
                {wordsLearned.toLocaleString()}
              </div>
              <div className='text-slate-400 pb-2 text-lg leading-tight font-serif italic'>
                words learned<br/>today by users
              </div>
            </div>
            
            <div className='flex items-center gap-4 font-sans'>
               <div className='flex -space-x-3'>
                 <div className='w-11 h-11 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-sm'>JD</div>
                 <div className='w-11 h-11 rounded-full bg-blue-900 border-2 border-slate-900 flex items-center justify-center text-sm font-bold text-blue-200 shadow-sm'>AM</div>
                 <div className='w-11 h-11 rounded-full bg-emerald-900 border-2 border-slate-900 flex items-center justify-center text-sm font-bold text-emerald-200 shadow-sm'>RK</div>
               </div>
               <div className='flex items-center text-base text-slate-400'>
                 <span className='w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse'></span>
                 {activeUsers} active now
               </div>
            </div>
          </div>
          
        </div>

        {/* ASYMMETRICAL FEATURE SECTION 2 (REVERSED) */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center pt-8'>
          
          {/* Left side: Text for SRS */}
          <div className='lg:col-span-5 flex flex-col justify-center space-y-8 lg:pr-8'>
            <div>
              <h3 className='text-3xl font-serif text-white mb-4'>Never forget again</h3>
              <p className='text-slate-400 leading-relaxed text-lg'>
                Our spaced repetition algorithm learns your memory patterns. Words you struggle with appear more often, while mastered words are scheduled right before you forget them.
              </p>
            </div>
            
            <div className='flex gap-10 border-t border-slate-700/50 pt-8'>
              <div>
                <div className='text-4xl font-light text-blue-400 tabular-nums'>94%</div>
                <div className='text-slate-500 font-serif italic mt-2'>retention rate</div>
              </div>
              <div>
                <div className='text-4xl font-light text-emerald-400 tabular-nums'>3x</div>
                <div className='text-slate-500 font-serif italic mt-2'>faster learning</div>
              </div>
            </div>
          </div>

          {/* Right side: Visual for SRS timeline */}
          <div className='lg:col-span-7 bg-slate-800/40 p-6 sm:p-10 rounded-[2rem] border border-slate-700/50 relative overflow-hidden'>
            <div className='absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl'></div>
            
            <div className='bg-slate-900/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl relative w-full'>
               <div className='flex items-center justify-between mb-10'>
                 <div className='text-white font-serif text-2xl'>Resilience</div>
                 <div className='px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium uppercase tracking-wider'>
                   Mastered
                 </div>
               </div>
               
               {/* Timeline visualization */}
               <div className='relative flex justify-between items-end h-28 border-b border-slate-700 pb-2 mb-6'>
                 <div className='absolute left-0 bottom-2 w-full h-[1px] bg-slate-700/50 border-dashed border-b border-slate-700'></div>
                 
                 {/* Bars representing reviews over time */}
                 <div className='relative flex flex-col items-center gap-3 z-10'>
                   <div className='w-5 h-8 bg-slate-700 rounded-t-sm'></div>
                   <span className='text-xs text-slate-500 font-sans'>Day 1</span>
                 </div>
                 <div className='relative flex flex-col items-center gap-3 z-10'>
                   <div className='w-5 h-12 bg-slate-600 rounded-t-sm'></div>
                   <span className='text-xs text-slate-500 font-sans'>Day 3</span>
                 </div>
                 <div className='relative flex flex-col items-center gap-3 z-10'>
                   <div className='w-5 h-16 bg-blue-500/50 rounded-t-sm'></div>
                   <span className='text-xs text-blue-400/80 font-sans'>Day 7</span>
                 </div>
                 <div className='relative flex flex-col items-center gap-3 z-10'>
                   <div className='w-5 h-20 bg-emerald-500 rounded-t-sm relative'>
                     <div className='absolute -top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping'></div>
                   </div>
                   <span className='text-xs text-emerald-400 font-sans font-bold'>Today</span>
                 </div>
                 <div className='relative flex flex-col items-center gap-3 z-10 opacity-40'>
                   <div className='w-5 h-24 bg-slate-800 border border-slate-700 rounded-t-sm'></div>
                   <span className='text-xs text-slate-500 font-sans'>Day 21</span>
                 </div>
               </div>
               
               <div className='text-center text-slate-400 italic font-serif mt-2'>
                 Next review scheduled in 14 days
               </div>
            </div>
          </div>
          
        </div>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .animate-flip-slow {
          animation: flip-slow 6s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes flip-slow {
          0%, 35% { transform: rotateY(0deg); }
          50%, 85% { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Home;