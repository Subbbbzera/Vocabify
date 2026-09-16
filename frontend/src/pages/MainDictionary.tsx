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
  editOpacity?: number,
  pinOpacity?: number
};

function MainDictionary() {

  const [modal, setModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [renameModal, setRenameModal] = useState(false)
  const [editingDictionary, setEditingDictionary] = useState<MainDictionaries | null>(null)

  const [dictionaries, setDictionaries] = useState<MainDictionaries[]>([])
  const [searchValue, setSearchValue] = useState("")

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
  .then(res => {
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    if (Array.isArray(data)) {
      setDictionaries(data);
    } else {
      console.warn("Expected array of dictionaries, got:", data);
      setDictionaries([]);
    }
  })
  .catch(err => {
    console.error("Failed to fetch dictionaries:", err);
    setDictionaries([]);
  });
}

useEffect(() => {
  fetchDictionaries()
}, [])

const filteredDictionaries = (Array.isArray(dictionaries) ? dictionaries : []).filter(d =>
  (d?.dictionaryName?.toLowerCase() || "").includes(searchValue.toLowerCase()) ||
  (d?.language?.toLowerCase() || "").includes(searchValue.toLowerCase())
)

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
    const userId = getUserId();
    fetch(getBackendUrl(`/dictionary/copy`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId?.toString() || ""
      },
      body: JSON.stringify({ id: editingDictionary.dictionaryId })
    })
    .then(res => res.json())
    .then(() => {
      fetchDictionaries()
      setRenameModal(false)
      setEditingDictionary(null)
    })
  }
}

const togglePinDictionary = (dict: MainDictionaries, e: React.MouseEvent) => {
  e.stopPropagation();
  const userId = getUserId();
  fetch(getBackendUrl(`/dictionary/update`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-id": userId?.toString() || ""
    },
    body: JSON.stringify({
      id: dict.dictionaryId,
      isPinned: !dict.isPinned
    })
  })
  .then(res => res.json())
  .then(() => {
    fetchDictionaries();
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

  <div className='flex flex-col gap-9 md:mt-[1.5%] mt-[5%]'>

    <div className='relative w-[70%] md:w-[40%] mx-auto flex gap-2'>

       <div className='relative flex-1'>
         <Input
           placeholder='Dictionary name'
           paddingX='px-3'
           paddingY='py-2'
           width='w-full'
           value={searchValue}
           onchange={(val) => setSearchValue(val)}
           setValue={setSearchValue}
         />
          <button className='absolute right-3 top-3 text-slate-300'><FaSearch/></button>
       </div>

       <button
         onClick={() => setImportModal(true)}
         className='p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all flex items-center gap-2 px-4'
         title="Smart Import from Samsung Notes"
       >
         <FaFileImport />
         <span className='hidden md:inline text-xs font-bold uppercase'>Import</span>
       </button>
    </div>

    <div className='flex flex-wrap md:ml-60'>

  {filteredDictionaries.length != 0 ?

  filteredDictionaries.map((elem, _) => (

    <Dictionaty
      key={elem.dictionaryId}
      {...elem}
      onClick={() => navigate(`/InnerD/${elem.dictionaryId}`)}
      onRename={() => handleRenameClick(elem)}
      onPinToggle={(e) => togglePinDictionary(elem, e)}
    />
  ))

  : null}

      <div className='flex items-center justify-center bg-none w-[10.5rem] h-52 max-h-[30vh] md:w-[14rem] md:h-72 md:max-h-[80vh] rounded-lg ml-4 mb-5 overflow-hidden border-2 border-dashed border-slate-500 duration-200 hover:border-slate-300 group'>

        <button onClick={Close}>
          <FaPlus className='text-2xl font-white duration-200 group-hover:scale-150'/>
        </button>

      </div>

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
      editOpacity: editingDictionary.editOpacity,
      pinOpacity: editingDictionary.pinOpacity
    }}
  />
) : null}

  </div>
)

}

export default MainDictionary
