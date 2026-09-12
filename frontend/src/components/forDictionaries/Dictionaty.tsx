import { FaEdit } from 'react-icons/fa';
import { FaThumbtack } from 'react-icons/fa6';

export type DictionaryProps = {

  dictionaryId : number
  dictionaryName: string
  language: string;
  amountWord: number;
  rememberedWords?: number;

  coverImage?: string;
  showName?: boolean;
  showLanguage?: boolean;
  showFlag?: boolean;
  showProgress?: boolean;
  showImported?: boolean;
  isImported?: boolean;
  isPinned?: boolean;
  editOpacity?: number;
  pinOpacity?: number;

  onClick: () => void
  onRename: (e: React.MouseEvent) => void
  onPinToggle?: (e: React.MouseEvent) => void
}

function Dictionaty(props: DictionaryProps) {

  const progress = props.amountWord > 0
    ? Math.round((props.rememberedWords || 0) / props.amountWord * 100)
    : 0;

  const showName = props.showName ?? true;
  const showLanguage = props.showLanguage ?? true;
  const showFlag = props.showFlag ?? true;
  const showProgress = props.showProgress ?? true;
  const showImported = props.showImported ?? true;

  return (

  <div className='flex flex-col items-center justify-center bg-slate-800 w-[10.5rem] h-52 max-h-[30vh] md:w-[14rem] md:h-72 md:max-h-[80vh] rounded-lg ml-4 mb-5 overflow-hidden border-2 border-slate-500 duration-200 hover:border-slate-300 group cursor-pointer relative'
  onClick={props.onClick}>

    {props.coverImage && (
      <div className='absolute inset-0 z-0'>
        <img src={props.coverImage} alt="" className='w-full h-full object-cover' />
      </div>
    )}

    <button
      className={`absolute top-3 left-3 z-20 p-1.5 rounded-lg border transition-all duration-200 ${
        props.isPinned
          ? 'bg-amber-400/20 border-amber-400/50 text-amber-400 hover:bg-amber-400/30'
          : 'bg-transparent border-slate-500/50 text-slate-400 hover:border-slate-300 hover:text-white'
      }`}
      style={{ opacity: props.pinOpacity ?? 1 }}
      onClick={(e) => {
        e.stopPropagation();
        if (props.onPinToggle) {
          props.onPinToggle(e);
        }
      }}
    >
      <FaThumbtack size={12} className={props.isPinned ? 'rotate-45' : ''} />
    </button>

    <button
      className='absolute top-3 right-3 text-white drop-shadow-lg hover:text-blue-400 transition-colors z-20'
      style={{ opacity: props.editOpacity ?? 1 }}
      onClick={(e) => {
        e.stopPropagation();
        props.onRename(e);
      }}
    >
      <FaEdit size={18} />
    </button>

    <div className='relative z-10 flex flex-col items-center w-full h-full justify-center p-2'>

      {showImported && props.isImported && (
        <span className={`absolute ${props.isPinned ? 'top-10 left-3' : 'top-3 left-3'} bg-blue-600 text-[0.6rem] text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter shadow-md transition-all`}>
          Imported
        </span>
      )}

      {showFlag && (
        <div className='w-16 mt-4 mb-2 drop-shadow-md'>
              <img src={`./public/${props.language}.png`} alt="Прапор" className=''/>
        </div>
      )}

      <div className={`flex flex-col gap-0 items-center rounded-lg p-2 transition-all ${props.coverImage ? 'bg-black/20 backdrop-blur-[2px]' : ''}`}>
        {showName && (
          <h2 className={`text-[1rem] font-bold md:text-xl px-2 mb-1 text-center transition-colors ${props.coverImage ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-slate-300'}`}>
            {props.dictionaryName}
          </h2>
        )}

        {showProgress && (
          <div className='flex flex-col items-center'>
            <p className={`text-[0.8rem] md:text-sm font-medium transition-colors ${props.coverImage ? 'text-slate-100 drop-shadow-md' : 'text-slate-400'}`}>Words: {props.amountWord}</p>
            <p className={`text-[0.7rem] md:text-xs font-black transition-colors ${props.coverImage ? 'text-white drop-shadow-md' : ''} ${progress === 100 ? 'text-emerald-400' : props.coverImage ? 'text-slate-100' : 'text-slate-400'}`}>
              Progress: {progress}%
            </p>
          </div>
        )}
      </div>

      {(showName || showProgress) && showLanguage && (
        <hr className={`border-[0.5px] w-32 mt-1 mb-0.5 transition-colors ${props.coverImage ? 'border-white/40 shadow-sm' : 'border-slate-600/50'}`}/>
      )}

      {showLanguage && (
        <p className={`text-[0.9rem] md:text-sm text-center font-bold px-3 py-1 rounded-full transition-all whitespace-nowrap ${props.coverImage ? 'text-white bg-black/20 backdrop-blur-[2px] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-slate-300'}`}>
          Language: <span className='capitalize'>{props.language}</span>
        </p>
      )}

    </div>

  </div>

  )
}

export default Dictionaty
