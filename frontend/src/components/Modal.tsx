import { useState, useRef, useEffect } from 'react'
import { FaChevronDown, FaTrash, FaImage, FaEllipsisVertical, FaCopy, FaDownload } from 'react-icons/fa6'

interface ModalProp {

  name : string
  input1 : string
  input2? : string
  input2Type? : string

  placeholder1 : string

  buttonText : string
  onClose : () => void,
  onCreate : (data: {
    field1: string,
    field2: string,
    extraFields?: string[],
    remembered?: boolean,
    coverImage?: string,
    showName?: boolean,
    showLanguage?: boolean,
    showFlag?: boolean,
    showProgress?: boolean,
    showImported?: boolean,
    isPinned?: boolean,
    editOpacity?: number,
    pinOpacity?: number
  }) => boolean | string | void,
  onDelete? : () => void,
  onCopy? : () => void,
  onExportFile? : () => void,

  defaultValue1?: string,
  defaultValue2?: string,
  defaultExtraFields?: string[],
  defaultRemembered?: boolean,
  showAddMore?: boolean,

  isDictionary?: boolean,
  defaultSettings?: {
    coverImage?: string;
    showName: boolean;
    showLanguage: boolean;
    showFlag: boolean;
    showProgress: boolean;
    showImported: boolean;
    isPinned: boolean;
    editOpacity?: number;
    pinOpacity?: number;
  }
}

function Modal({
  name, input1, input2, placeholder1, input2Type = "input", buttonText, onClose, onCreate, onDelete, onCopy,
  onExportFile,
  defaultValue1, defaultValue2, defaultExtraFields, defaultRemembered, showAddMore,
  isDictionary, defaultSettings
} : ModalProp) {

  const [fields, setFields] = useState({field1: defaultValue1 || "", field2: defaultValue2 || ""})
  const [extraFields, setExtraFields] = useState<string[]>(defaultExtraFields || [])
  const [remembered, setRemembered] = useState(defaultRemembered || false)
  const [validationError, setValidationError] = useState("")

  const [coverImage, setCoverImage] = useState(defaultSettings?.coverImage || "")
  const [showName, setShowName] = useState(defaultSettings?.showName ?? true)
  const [showLanguage, setShowLanguage] = useState(defaultSettings?.showLanguage ?? true)
  const [showFlag, setShowFlag] = useState(defaultSettings?.showFlag ?? true)
  const [showProgress, setShowProgress] = useState(defaultSettings?.showProgress ?? true)
  const [showImported, setShowImported] = useState(defaultSettings?.showImported ?? true)
  const [isPinned] = useState(defaultSettings?.isPinned ?? false)
  const [editOpacity, setEditOpacity] = useState(defaultSettings?.editOpacity ?? 1.0)
  const [pinOpacity, setPinOpacity] = useState(defaultSettings?.pinOpacity ?? 1.0)

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };
    if (showActions) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActions]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

const Create = () =>{
  setValidationError("");

  if (!fields.field1.trim()) {
    setValidationError(`Please fill in: ${input1}`);
    return;
  }

  if (input2Type !== "hidden" && !fields.field2.trim()) {
    setValidationError(`Please fill in: ${input2}`);
    return;
  }

  const result = onCreate({
    ...fields,
    extraFields,
    remembered,
    coverImage,
    showName,
    showLanguage,
    showFlag,
    showProgress,
    showImported,
    isPinned,
    editOpacity,
    pinOpacity
  });

  if (result === true) {
    onClose();
  } else if (typeof result === "string") {
    setValidationError(result);
  }

}

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  Create();
}

const Toggle = ({label, value, onChange}: {label: string, value: boolean, onChange: (v: boolean) => void}) => (
  <div className='flex items-center justify-between bg-slate-700/30 p-2 px-3 rounded-lg border border-slate-700/50 cursor-pointer select-none transition-all hover:bg-slate-700/50' onClick={() => onChange(!value)}>
    <span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>{label}</span>
    <div className={`w-8 h-4 rounded-full transition-all relative ${value ? 'bg-blue-600' : 'bg-slate-600'}`}>
      <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${value ? 'right-0.5' : 'left-0.5'}`}></div>
    </div>
  </div>
)

  return (

    <form className='fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-2'  onClick={onClose} onSubmit={handleSubmit}>

      <div className='bg-slate-800 rounded-xl p-4 sm:p-6 md:p-8 w-[90%] max-w-[95%] sm:max-w-md shadow-2xl overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[90vh]' onClick={e => e.stopPropagation()}>

        <div className='flex items-center justify-between mb-6'>
          <div className='w-8'></div>
          <h2 className='text-xl sm:text-xl md:text-2xl font-bold text-white text-center flex-1'>
            {name}
          </h2>
          <div className='w-8 flex justify-end relative' ref={actionsRef}>
            {(onDelete || onCopy || onExportFile) && (
              <>
                <button
                  type="button"
                  onClick={() => setShowActions(!showActions)}
                  className='text-slate-400 hover:text-white transition-colors p-1'
                >
                  <FaEllipsisVertical className='text-lg' />
                </button>

                {showActions && (
                  <div className='absolute top-full right-0 mt-2 w-48 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl z-[100] overflow-hidden py-1'>
                    {onExportFile && (
                      <button
                        type="button"
                        onClick={() => { onExportFile(); setShowActions(false); }}
                        className='w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-600 text-slate-200 transition-colors text-sm font-medium border-b border-slate-600/50'
                      >
                        <FaDownload className='text-sm text-emerald-400' />
                        <span>Download TXT File</span>
                      </button>
                    )}
                    {onCopy && (
                      <button
                        type="button"
                        onClick={() => { onCopy(); setShowActions(false); }}
                        className='w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-600 text-slate-200 transition-colors text-sm font-medium border-b border-slate-600/50'
                      >
                        <FaCopy />
                        <span>Duplicate</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if(window.confirm("Are you sure you want to delete this?")) {
                            onDelete();
                            onClose();
                          }
                          setShowActions(false);
                        }}
                        className='w-full flex items-center gap-3 px-4 py-2 hover:bg-rose-500/10 text-rose-500 transition-colors text-sm font-medium'
                      >
                        <FaTrash className='text-sm' />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {validationError && (
          <div className='mb-4 p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-center shadow-lg transition-all duration-300'>
            <h1 className='text-sm sm:text-base font-extrabold text-rose-400 tracking-wider uppercase'>
              {validationError}
            </h1>
          </div>
        )}

        <div className='flex flex-col gap-6 sm:gap-4 md:gap-5'>

          {isDictionary && (
            <div className='flex flex-col gap-2'>
               <label className='text-sm font-semibold text-white/80 uppercase tracking-wider'>Cover Image</label>
               <div
                className='w-full h-32 bg-slate-700 rounded-lg border-2 border-dashed border-slate-500 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group'
                onClick={() => fileInputRef.current?.click()}
               >
                 {coverImage ? (
                   <>
                    <img src={coverImage} alt="Cover" className='w-full h-full object-cover' />
                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <FaImage className='text-white text-2xl' />
                    </div>
                   </>
                 ) : (
                   <>
                    <FaImage className='text-slate-500 text-3xl mb-2' />
                    <span className='text-xs text-slate-400'>Click to upload cover</span>
                   </>
                 )}
               </div>
               <input type="file" ref={fileInputRef} className='hidden' accept="image/*" onChange={handleImageChange} />
               {coverImage && (
                 <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className='text-xs text-rose-500 hover:text-rose-400 font-bold uppercase'
                 >
                   Remove Image
                 </button>
               )}
            </div>
          )}

          <div className='flex flex-col gap-1 sm:gap-2'>
            <label className='text-sm sm:text-sm font-semibold text-white/80 uppercase tracking-wider'>
              {input1}
            </label>
            <div className='flex flex-col gap-2'>
              {placeholder1 === "textarea" ? (
                <textarea
                  value={fields.field1} onChange={e => { setFields(prev => ({...prev, field1: e.target.value})); setValidationError(""); }}
                  placeholder={`apple - яблуко
go, went, gone - йти`} required
                  className='px-3 py-2 sm:px-4 sm:py-2 text-base bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[200px] resize-none'
                />
              ) : (
                <input
                  type="text" value={fields.field1} onChange={e => { setFields(prev => ({...prev, field1: e.target.value})); setValidationError(""); }}
                  placeholder={placeholder1} required minLength={1}
                  className='px-3 py-2 sm:px-4 sm:py-2 text-base bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all'
                />
              )}

              {showAddMore && (
                <>
                  {extraFields.map((val, index) => (
                    <div key={index} className='flex gap-2 items-center'>
                      <input
                        type="text"
                        value={val}
                        onChange={e => {
                          const newExtra = [...extraFields]
                          newExtra[index] = e.target.value
                          setExtraFields(newExtra)
                        }}
                        placeholder={`Extra form ${index + 1}`}
                        className='px-3 py-2 sm:px-4 sm:py-2 text-sm bg-slate-700/50 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-400 transition-all'
                      />
                      <button
                        type="button"
                        onClick={() => setExtraFields(prev => prev.filter((_, i) => i !== index))}
                        className='p-2 text-rose-500 hover:text-rose-400 transition-colors'
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setExtraFields(prev => [...prev, ""])}
                    className='flex items-center justify-center gap-2 py-2 mt-1 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all w-full'
                  >
                    <FaChevronDown className='text-xs' />
                    <span className='text-xs uppercase font-bold tracking-tighter'>Add more forms</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {input2Type !== "hidden" && (
            <div className='flex flex-col gap-1 sm:gap-2'>
              <label className='text-sm sm:text-sm font-semibold text-white/80 uppercase tracking-wider'>
                {input2}
              </label>

              {input2Type === "select" ? (
                <select
                  value={fields.field2} onChange={e => { setFields(prev => ({...prev, field2: e.target.value})); setValidationError(""); }} required
                  className='px-3 py-2 sm:px-4 sm:py-2 text-base bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer'
                >
                  <option value="">Select a language</option>
                  <option value="english">English</option>
                  <option value="german">German</option>
                  <option value="portugal">Portugal</option>
                  <option value="netherlands">Netherlands</option>
                  <option value="ukrainian">Ukrainian</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                </select>
              ) : input2Type.trim().toLowerCase() === "input" ? (
                <input
                  type="text" value={fields.field2} onChange={e => { setFields(prev => ({...prev, field2: e.target.value})); setValidationError(""); }}
                  required minLength={1}
                  className='px-3 py-2 sm:px-4 sm:py-2 text-sm bg-slate-700 rounded-lg w-full text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all'
                />
              ) : null}

            </div>
          )}

          {isDictionary && (
            <div className='flex flex-col gap-2 mt-2'>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className='flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white transition-all w-full text-xs font-semibold'
              >
                <span>Advanced Display Settings</span>
                <FaChevronDown className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className='grid grid-cols-2 gap-2 p-3 bg-slate-900/30 rounded-lg border border-slate-700/30 animate-in fade-in slide-in-from-top-2'>
                  <Toggle label="Show Name" value={showName} onChange={setShowName} />
                  <Toggle label="Show Language" value={showLanguage} onChange={setShowLanguage} />
                  <Toggle label="Show Flag" value={showFlag} onChange={setShowFlag} />
                  <Toggle label="Show Progress" value={showProgress} onChange={setShowProgress} />
                  <Toggle label="Show Imported" value={showImported} onChange={setShowImported} />
                  <div className='col-span-2 border-t border-slate-700/30 pt-3 mt-1 flex flex-col gap-3'>
                    <div className='flex flex-col gap-1.5'>
                      <div className='flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400'>
                        <span>Edit Icon Opacity</span>
                        <span className='text-sky-400'>{Math.round(editOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={editOpacity}
                        onChange={(e) => setEditOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <div className='flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400'>
                        <span>Pin Icon Opacity</span>
                        <span className='text-sky-400'>{Math.round(pinOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={pinOpacity}
                        onChange={(e) => setPinOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAddMore && (
            <div className='flex items-center gap-3 bg-slate-700/30 p-3 rounded-lg border border-slate-700/50 cursor-pointer select-none' onClick={() => setRemembered(!remembered)}>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${remembered ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-700 border-slate-600'}`}>
                {remembered && <div className="w-2 h-2 bg-white rounded-full shadow-sm animate-pulse"></div>}
              </div>
              <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${remembered ? 'text-emerald-400' : 'text-slate-500/80'}`}>
                {remembered ? 'Word Known' : 'Still Learning'}
              </span>
            </div>
          )}

          <div className='flex flex-row gap-2 sm:gap-3 mt-2 sm:mt-4'>
            <button
            type="button"
            className='w-full sm:flex-1 px-4 py-3 sm:px-6 sm:py-3 text-lg sm:text-base bg-slate-700 text-white rounded-lg font-semibold uppercase tracking-wider hover:bg-slate-600 transition-all'
            onClick={onClose}>
              Cancel
            </button>
            <button
            type="submit"
            className='w-full sm:flex-1 px-4 py-3 sm:px-6 sm:py-3 text-lg sm:text-base bg-blue-600 text-white rounded-lg font-semibold uppercase tracking-wider hover:bg-blue-500 transition-all'
            onClick={Create}>
              {buttonText}
            </button>
          </div>

        </div>

      </div>

    </form>
  )
}

export default Modal
