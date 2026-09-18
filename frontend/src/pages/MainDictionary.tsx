import { useEffect, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { FaPlus, FaFileImport } from 'react-icons/fa6'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Dictionaty from '../components/forDictionaries/Dictionaty'
import { useNavigate } from 'react-router-dom'
import type { MainDictionaries } from '../types'
import { getBackendUrl } from '../services/api'

export type ModalData = {
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
  isPublic?: boolean,
  tags?: string[],
  editOpacity?: number,
  pinOpacity?: number
};

function MainDictionary() {

  const [modal, setModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [renameModal, setRenameModal] = useState(false)
  const [editingDictionary, setEditingDictionary] = useState<MainDictionaries | null>(null)

  const [dictionaries, setDictionaries] = useState<MainDictionaries[]>([])
  const [suggestedDictionaries, setSuggestedDictionaries] = useState<MainDictionaries[]>([])
  const [activeTab, setActiveTab] = useState<'my' | 'suggested'>('my')
  const [searchValue, setSearchValue] = useState("")

  const [filterModal, setFilterModal] = useState(false)
  const [filters, setFilters] = useState({
    minWords: '',
    maxWords: '',
    minRating: '',
    minViews: ''
  })

  const navigate = useNavigate()

const getUserId = () => {
  const saved = localStorage.getItem('sessionUser');
  if (saved) return JSON.parse(saved).id;
  return null;
}

const fetchDictionaries = () => {
  const userId = getUserId();
  fetch(getBackendUrl("/dictionary/Getdictionary"), {
    headers: { "user-id": userId?.toString() || "" }
  })
  .then(res => res.ok ? res.json() : [])
  .then(data => setDictionaries(Array.isArray(data) ? data : []))
  .catch(err => console.error(err));
}

const fetchSuggested = () => {
  const userId = getUserId();
  fetch(getBackendUrl("/dictionary/suggested"), {
    headers: { "user-id": userId?.toString() || "" }
  })
  .then(res => res.ok ? res.json() : [])
  .then(data => setSuggestedDictionaries(Array.isArray(data) ? data : []))
  .catch(err => console.error(err));
}

useEffect(() => {
  fetchDictionaries()
  fetchSuggested()
}, [])

const currentList = activeTab === 'my' ? dictionaries : suggestedDictionaries;

const filteredDictionaries = (Array.isArray(currentList) ? currentList : [])
  .filter(d =>
    (d?.dictionaryName?.toLowerCase() || "").includes(searchValue.toLowerCase()) ||
    (d?.language?.toLowerCase() || "").includes(searchValue.toLowerCase()) ||
    (d?.tags && d.tags.some(t => t.toLowerCase().includes(searchValue.toLowerCase())))
  )
  .filter(d => {
    if (activeTab === 'my') return true;
    const minW = parseInt(filters.minWords);
    if (!isNaN(minW) && (d.amountWord || 0) < minW) return false;
    
    const maxW = parseInt(filters.maxWords);
    if (!isNaN(maxW) && (d.amountWord || 0) > maxW) return false;
    
    const minR = parseFloat(filters.minRating);
    if (!isNaN(minR) && (d.averageRating || 0) < minR) return false;
    
    const minV = parseInt(filters.minViews);
    if (!isNaN(minV) && (d.views || 0) < minV) return false;

    return true;
  });

const Close = () =>{
  setModal(!modal)
}

const Create = (object : ModalData) =>{
  const userId = getUserId();

  const dictionaryToSave = {
    dictionaryName : object.field1,
    language : object.field2,
    coverImage: object.coverImage,
    showName: object.showName,
    showLanguage: object.showLanguage,
    showFlag: object.showFlag,
    showProgress: object.showProgress,
    showImported: object.showImported,
    isPinned: object.isPinned || false,
    isPublic: object.isPublic,
    tags: object.tags,
    editOpacity: object.editOpacity,
    pinOpacity: object.pinOpacity
  }

   if(dictionaryToSave.dictionaryName.trim() && dictionaryToSave.language.trim()){

    fetch(getBackendUrl("/dictionary/create"), {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "user-id": userId?.toString() || ""
      },
      body: JSON.stringify(dictionaryToSave)
    })
    .then(async res => {
      if (!res.ok) throw new Error("Failed to create");
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    })
    .then(() => fetchDictionaries())
  }
    return true
}

const SmartImport = (object: ModalData) => {
  const userId = getUserId();
  const text = object.field1;
  const language = object.field2;
  const dictionaryName = "Imported " + new Date().toLocaleDateString();

  const lines = text.split('\n').filter(line => line.trim() !== '' && line.includes('-'));

  const words = lines.map(line => {
    const [left, right] = line.split('-').map(part => part.trim());
    if (!left || !right) return null;

    const leftParts = left.split(',').map(p => p.trim());
    const originalText = leftParts[0];
    const extraForms = leftParts.slice(1);

    return {
      text: originalText,
      translate: right,
      extraForms: extraForms
    };
  }).filter(w => w !== null);

  if (words.length > 0) {
    fetch(getBackendUrl("/dictionary/import"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId?.toString() || ""
      },
      body: JSON.stringify({
        dictionaryName,
        language,
        words,
        coverImage: object.coverImage,
        showName: object.showName,
        showLanguage: object.showLanguage,
        showFlag: object.showFlag,
        showProgress: object.showProgress,
        showImported: object.showImported,
        isPinned: object.isPinned || false,
        isPublic: object.isPublic,
        tags: object.tags,
        editOpacity: object.editOpacity,
        pinOpacity: object.pinOpacity
      })
    })
    .then(res => res.json())
    .then(() => fetchDictionaries());
  }

  return true;
}

const handleRenameClick = (dictionary: MainDictionaries) => {
  setEditingDictionary(dictionary)
  setRenameModal(true)
}

const ConfirmUpdate = (object: ModalData) => {
  if (editingDictionary && object.field1.trim()) {
    const userId = getUserId();
    fetch(getBackendUrl("/dictionary/update"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId?.toString() || ""
      },
      body: JSON.stringify({
        id: editingDictionary.dictionaryId,
        dictionaryName: object.field1,
        language: object.field2,
        coverImage: object.coverImage,
        showName: object.showName,
        showLanguage: object.showLanguage,
        showFlag: object.showFlag,
        showProgress: object.showProgress,
        showImported: object.showImported,
        isPinned: object.isPinned ?? editingDictionary.isPinned,
        isPublic: object.isPublic,
        tags: object.tags,
        editOpacity: object.editOpacity,
        pinOpacity: object.pinOpacity
      })
    })
    .then(res => res.ok ? res.text().then(t => t ? JSON.parse(t) : {}) : Promise.reject("Failed to update"))
    .then(() => {
      fetchDictionaries()
      setRenameModal(false)
      setEditingDictionary(null)
    })
  }
  return true
}

const handleDeleteDictionary = () => {
  if (editingDictionary) {
    const userId = getUserId();
    fetch(getBackendUrl(`/dictionary/delete`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId?.toString() || ""
      },
      body: JSON.stringify({ id: editingDictionary.dictionaryId })
    })
    .then(() => {
      fetchDictionaries()
      setRenameModal(false)
      setEditingDictionary(null)
    })
  }
}

const handleCopyDictionary = () => {
  if (editingDictionary) {
    handleCopyDictionaryDirectly(editingDictionary.dictionaryId);
  }
}

const handleCopyDictionaryDirectly = (id: number) => {
  const userId = getUserId();
  fetch(getBackendUrl(`/dictionary/copy`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": userId?.toString() || ""
    },
    body: JSON.stringify({ id })
  })
  .then(res => res.json())
  .then(() => {
    fetchDictionaries();
    if (activeTab === 'suggested') {
      alert("Dictionary copied successfully!");
    }
    setRenameModal(false);
    setEditingDictionary(null);
  })
}

const togglePinDictionary = (dict: MainDictionaries, e: React.MouseEvent) => {
  e.stopPropagation()
  const userId = getUserId();
  fetch(getBackendUrl(`/dictionary/update/${dict.dictionaryId}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "user-id": userId?.toString() || ""
    },
    body: JSON.stringify({ isPinned: !dict.isPinned })
  })
  .then(() => fetchDictionaries())
}



const handleRateDictionary = (id: number, stars: number) => {
  const userId = getUserId();
  fetch(getBackendUrl(`/dictionary/${id}/rate`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": userId?.toString() || ""
    },
    body: JSON.stringify({ stars })
  })
  .then(() => fetchSuggested());
}

const handleViewDictionary = (id: number) => {
  const userId = getUserId();
  fetch(getBackendUrl(`/dictionary/${id}/view`), {
    method: "POST",
    headers: {
      "user-id": userId?.toString() || ""
    }
  });
}

const fetchWordsForExport = async (dictionaryId: number): Promise<any[]> => {
  const userId = getUserId();
  try {
    const res = await fetch(getBackendUrl(`/word/getWord/${dictionaryId}`), {
      headers: { "user-id": userId?.toString() || "" }
    });
    const data = await res.json();
    const allWordsFlat = Object.values(data).flat();
    return allWordsFlat;
  } catch (err) {
    console.error("Failed to fetch words for export:", err);
    alert("Failed to load dictionary words.");
    return [];
  }
};

const getFormattedText = (words: any[]): string => {
  if (!words.length) return "";
  return words.map(word => {
    const leftPart = [word.text, ...(word.extraForms || [])].join(', ');
    return `${leftPart} - ${word.translate}`;
  }).join('\n');
};

const handleExportFile = async (dict: MainDictionaries) => {
  const words = await fetchWordsForExport(dict.dictionaryId);
  const text = getFormattedText(words);
  if (!text) {
    alert("No words to export!");
    return;
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dictionary-${dict.dictionaryName || dict.dictionaryId}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

return (

  <div className='flex flex-col gap-10 mt-12 md:mt-10'>

    <div className='flex flex-col gap-5 w-[90%] md:w-[65%] lg:w-[70%] mx-auto md:ml-[250px] lg:ml-[280px]'>

      {/* Search and Import */}
      <div className='flex gap-2 w-full'>
         <div className='relative flex-1'>
           <Input
             placeholder='Search by name, language or tags...'
             paddingX='px-3'
             paddingY='py-2'
             width='w-full'
             value={searchValue}
             onchange={(val) => setSearchValue(val)}
             setValue={setSearchValue}
           />
            <button className='absolute right-3 top-3 text-slate-400 hover:text-white transition-colors'><FaSearch/></button>
         </div>

         {activeTab === 'my' && (
           <button
             onClick={() => setImportModal(true)}
             className='p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all flex items-center gap-2 px-4 shadow-sm'
             title="Smart Import from Samsung Notes"
           >
             <FaFileImport />
             <span className='hidden sm:inline text-xs font-bold uppercase tracking-wider'>Import</span>
           </button>
         )}
      </div>

      {/* Tabs and Filters */}
      <div className='flex items-center justify-between w-full flex-wrap gap-4'>
        <div className='flex bg-slate-800 rounded-xl p-1 border border-slate-700 w-max shrink-0 shadow-sm'>
          <button 
            onClick={() => setActiveTab('my')}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            My Dictionaries
          </button>
          <button 
            onClick={() => setActiveTab('suggested')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition-all duration-300 border-2 ${activeTab === 'suggested' ? 'bg-transparent text-white border-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Suggested
          </button>
        </div>

        {activeTab === 'suggested' && (
          <button 
            onClick={() => setFilterModal(true)}
            className='px-6 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 font-bold text-sm hover:border-blue-400 hover:text-white transition-colors shrink-0 shadow-sm'
          >
            Filters
          </button>
        )}
      </div>
    </div>

    <div className='flex flex-wrap mx-auto w-[90%] md:w-auto md:ml-[250px] lg:ml-[280px] gap-4'>

  {filteredDictionaries.length != 0 ?

  filteredDictionaries.map((elem, _) => (

    <Dictionaty
      key={elem.dictionaryId}
      {...elem}
      onClick={() => {
        if (activeTab === 'suggested') {
          handleViewDictionary(elem.dictionaryId);
        }
        navigate(`/InnerD/${elem.dictionaryId}`, { state: { readOnly: activeTab === 'suggested', dictionary: elem } })
      }}
      onRename={activeTab === 'my' ? () => handleRenameClick(elem) : undefined}
      onPinToggle={activeTab === 'my' ? (e) => togglePinDictionary(elem, e) : undefined}
      isSuggested={activeTab === 'suggested'}
      onRate={(stars) => handleRateDictionary(elem.dictionaryId, stars)}
    />
  ))

  : null}

      {activeTab === 'my' && (
        <div className='flex items-center justify-center bg-none w-[10.5rem] h-52 max-h-[30vh] md:w-[14rem] md:h-72 md:max-h-[80vh] rounded-lg ml-4 mb-5 overflow-hidden border-2 border-dashed border-slate-500 duration-200 hover:border-slate-300 group'>
          <button onClick={Close}>
            <FaPlus className='text-2xl font-white duration-200 group-hover:scale-150'/>
          </button>
        </div>
      )}

    </div>

{modal ? (
  <Modal
    name="Create New Dictionary"
    input1='Dictionary Name'
    input2='Language'
    input2Type="select"
    placeholder1='e.g my English'
    buttonText="Create"
    onClose={Close}
    onCreate={Create}
    isDictionary={true}
  />
) : null}

{importModal ? (
  <Modal
    name="Smart Import"
    input1='Text from Notes'
    input2='Language'
    input2Type="select"
    placeholder1='textarea'
    buttonText="Import"
    onClose={() => setImportModal(false)}
    onCreate={SmartImport}
    isDictionary={true}
  />
) : null}

{/* Filter Sidebar */}
<div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${filterModal ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setFilterModal(false)}></div>
<div className={`fixed top-0 right-0 h-full w-[80%] md:w-[40%] max-w-md bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${filterModal ? 'translate-x-0' : 'translate-x-full'}`}>
  <div className='p-6 flex-1 overflow-y-auto'>
    <h2 className='text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2'>Filters</h2>
    
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <label className='text-sm font-bold text-slate-300 uppercase tracking-wider'>Word Count</label>
        <div className='flex gap-4 items-center'>
          <input 
            type="number" 
            placeholder="From"
            value={filters.minWords}
            onChange={e => setFilters(prev => ({...prev, minWords: e.target.value}))}
            className='bg-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full'
          />
          <span className='text-slate-400 font-bold'>-</span>
          <input 
            type="number" 
            placeholder="To"
            value={filters.maxWords}
            onChange={e => setFilters(prev => ({...prev, maxWords: e.target.value}))}
            className='bg-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full'
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <label className='text-sm font-bold text-slate-300 uppercase tracking-wider'>Minimum Rating</label>
        <input 
          type="number" 
          placeholder="e.g 4.5"
          step="0.1"
          min="0"
          max="5"
          value={filters.minRating}
          onChange={e => setFilters(prev => ({...prev, minRating: e.target.value}))}
          className='bg-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <label className='text-sm font-bold text-slate-300 uppercase tracking-wider'>Minimum Popularity (Views)</label>
        <input 
          type="number" 
          placeholder="e.g 100"
          value={filters.minViews}
          onChange={e => setFilters(prev => ({...prev, minViews: e.target.value}))}
          className='bg-slate-700 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-full'
        />
      </div>
    </div>
  </div>

  <div className='p-6 border-t border-slate-700 bg-slate-800/90 backdrop-blur-sm flex justify-end gap-3'>
    <button 
      onClick={() => {
        setFilters({minWords: '', maxWords: '', minRating: '', minViews: ''});
      }}
      className='px-4 py-2 text-slate-400 hover:text-white font-semibold transition-colors'
    >
      Reset
    </button>
    <button 
      onClick={() => setFilterModal(false)}
      className='px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all'
    >
      Apply Filters
    </button>
  </div>
</div>

{renameModal && editingDictionary ? (
  <Modal
    name="Edit Dictionary"
    input1='Name'
    input2='Language'
    input2Type="select"
    placeholder1={editingDictionary.dictionaryName}
    buttonText="Save"
    onClose={() => setRenameModal(false)}
    onCreate={ConfirmUpdate}
    onDelete={handleDeleteDictionary}
    onCopy={handleCopyDictionary}
    onExportFile={() => handleExportFile(editingDictionary)}
    defaultValue1={editingDictionary.dictionaryName}
    defaultValue2={editingDictionary.language}
    isDictionary={true}
    defaultSettings={{
      coverImage: editingDictionary.coverImage,
      showName: editingDictionary.showName,
      showLanguage: editingDictionary.showLanguage,
      showFlag: editingDictionary.showFlag,
      showProgress: editingDictionary.showProgress,
      showImported: editingDictionary.showImported,
      isPinned: editingDictionary.isPinned || false,
      isPublic: editingDictionary.isPublic,
      tags: editingDictionary.tags,
      editOpacity: editingDictionary.editOpacity,
      pinOpacity: editingDictionary.pinOpacity
    }}
  />
) : null}

  </div>
)

}

export default MainDictionary
