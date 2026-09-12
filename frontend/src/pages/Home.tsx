import { Link } from 'react-router-dom'
import { FaBook, FaLayerGroup, FaGraduationCap } from 'react-icons/fa6'

function Home() {
  return (
    <div className='min-h-screen md:ml-60 bg-slate-900 text-white px-4 py-6 pb-24 sm:px-8 sm:py-12 sm:pb-12 flex flex-col items-center'>
      <div className='max-w-5xl w-full space-y-8 sm:space-y-14'>

        <div className='text-center space-y-4 sm:space-y-6 pt-2 sm:pt-6'>
          <h1 className='text-2xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight'>
            Master New Words <br />
            <span className='text-blue-500'>Without Forgetting</span>
          </h1>

          <p className='text-slate-400 text-xs sm:text-lg max-w-2xl mx-auto leading-relaxed'>
            Organize your custom dictionaries, practice with active recall flashcards, and track your daily learning streak all in one clean workspace.
          </p>

          <div className='grid grid-cols-2 sm:flex sm:flex-row gap-2.5 sm:gap-3 justify-center items-center pt-2 max-w-md mx-auto sm:max-w-none'>
            <Link
              to='/mainDictionary'
              className='w-full sm:w-auto px-3 py-3 sm:px-6 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg uppercase tracking-wider text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-center'
            >
              <FaLayerGroup className='text-sm sm:text-base flex-shrink-0' />
              <span className='truncate'>Open Dictionaries</span>
            </Link>
            <Link
              to='/practice'
              className='w-full sm:w-auto px-3 py-3 sm:px-6 sm:py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg uppercase tracking-wider text-xs sm:text-sm transition-colors border border-slate-700 flex items-center justify-center gap-1.5 sm:gap-2 text-center'
            >
              <FaGraduationCap className='text-sm sm:text-base flex-shrink-0' />
              <span className='truncate'>Start Practice</span>
            </Link>
          </div>
        </div>

        <div className='w-full space-y-4 sm:space-y-6'>
          <div className='text-center space-y-1.5'>
            <h2 className='text-lg sm:text-2xl font-bold uppercase tracking-wider text-white'>
              Core Features
            </h2>
            <p className='text-slate-400 text-xs sm:text-sm max-w-lg mx-auto'>
              Everything you need to systematically build and reinforce your vocabulary.
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6'>

            <div className='bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 space-y-2.5 sm:space-y-3 flex flex-col justify-between'>
              <div className='space-y-2 sm:space-y-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 text-blue-400 rounded-lg flex items-center justify-center border border-slate-600'>
                  <FaBook size={16} />
                </div>
                <h3 className='text-sm sm:text-lg font-bold text-white uppercase tracking-wider'>
                  Custom Dictionaries
                </h3>
                <p className='text-slate-400 text-xs sm:text-sm leading-relaxed'>
                  Organize words by language, topic, or proficiency level. Keep all your terms, synonyms, and translations neatly grouped.
                </p>
              </div>
            </div>

            <div className='bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 space-y-2.5 sm:space-y-3 flex flex-col justify-between'>
              <div className='space-y-2 sm:space-y-3'>
                <div className='w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 text-blue-400 rounded-lg flex items-center justify-center border border-slate-600'>
                  <FaGraduationCap size={16} />
                </div>
                <h3 className='text-sm sm:text-lg font-bold text-white uppercase tracking-wider'>
                  Interactive Practice
                </h3>
                <p className='text-slate-400 text-xs sm:text-sm leading-relaxed'>
                  Reinforce vocabulary with active recall flashcard flips, writing tests, and daily streak tracking to master words permanently.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='w-full bg-slate-800 p-4 sm:p-8 rounded-xl border border-slate-700 space-y-3 sm:space-y-4'>
          <div className='flex items-center justify-between border-b border-slate-700 pb-2.5 sm:pb-3'>
            <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400'>
              <FaBook className='text-blue-500' />
              <span>Vocabulary Card Preview</span>
            </div>
            <span className='text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600'>
              English Vocabulary
            </span>
          </div>

          <div className='py-1 text-left space-y-1.5 sm:space-y-2'>
            <div className='text-xl sm:text-3xl font-bold text-white tracking-wide'>
              Perseverance
            </div>
            <div className='text-xs sm:text-sm text-slate-400 italic'>
              /ˌpɜː.sɪˈvɪə.rəns/ • noun
            </div>
            <p className='text-xs sm:text-base text-slate-300 pt-0.5 leading-relaxed'>
              "Persistence in doing something despite difficulty or delay in achieving success."
            </p>
            <div className='p-2.5 sm:p-3 bg-slate-900 rounded-lg border border-slate-700 text-xs sm:text-sm text-slate-400 mt-2 sm:mt-3'>
              <span className='text-blue-400 font-semibold uppercase tracking-wider'>Example: </span>
              Language learning requires continuous practice, dedication, and perseverance.
            </div>
          </div>
        </div>

        <div className='w-full bg-slate-800 p-4 sm:p-8 rounded-xl border border-slate-700 space-y-4 sm:space-y-6 mb-4 sm:mb-8'>
          <div className='text-center space-y-1'>
            <h2 className='text-lg sm:text-2xl font-bold uppercase tracking-wider text-white'>
              How It Works
            </h2>
            <p className='text-slate-400 text-xs sm:text-sm'>Three simple steps to consistent learning</p>
          </div>

          <div className='space-y-2.5 sm:space-y-3 pt-1'>

            <div className='flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl border border-slate-700/80'>
              <div className='flex-shrink-0 flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600/15 border border-blue-500/30 rounded-lg text-blue-400 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap'>
                Step 1:
              </div>
              <div className='flex-1 min-w-0 text-left space-y-0.5 sm:space-y-1'>
                <h4 className='text-xs sm:text-sm font-bold text-white uppercase tracking-wider'>
                  Create or Import
                </h4>
                <p className='text-[11px] sm:text-xs text-slate-400 leading-snug sm:leading-relaxed'>
                  Create your custom dictionary or import existing word lists in plain text with one click.
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl border border-slate-700/80'>
              <div className='flex-shrink-0 flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600/15 border border-blue-500/30 rounded-lg text-blue-400 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap'>
                Step 2:
              </div>
              <div className='flex-1 min-w-0 text-left space-y-0.5 sm:space-y-1'>
                <h4 className='text-xs sm:text-sm font-bold text-white uppercase tracking-wider'>
                  Add Examples
                </h4>
                <p className='text-[11px] sm:text-xs text-slate-400 leading-snug sm:leading-relaxed'>
                  Add context sentences, pronunciation, and synonyms to understand how words function in real situations.
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl border border-slate-700/80'>
              <div className='flex-shrink-0 flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600/15 border border-blue-500/30 rounded-lg text-blue-400 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap'>
                Step 3:
              </div>
              <div className='flex-1 min-w-0 text-left space-y-0.5 sm:space-y-1'>
                <h4 className='text-xs sm:text-sm font-bold text-white uppercase tracking-wider'>
                  Train Regularly
                </h4>
                <p className='text-[11px] sm:text-xs text-slate-400 leading-snug sm:leading-relaxed'>
                  Use quick flashcard sessions daily to reinforce active recall and keep your streak alive.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Home