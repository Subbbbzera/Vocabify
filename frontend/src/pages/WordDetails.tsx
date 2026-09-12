import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaEdit, FaPlus, FaCheck, FaTimes, FaVolumeUp, FaEllipsisV } from "react-icons/fa";
import Modal from "../components/Modal";
import { api } from "../services/api";

type WordDetail = {
  id: number;
  text: string;
  translate: string;
  extraForms: string[];
  examples: string[];
  createdAt: string;
  remembered: boolean;
  dictionaryId: number;
  language: string;
};

const languageMap: { [key: string]: string } = {
  english: 'en-US',
  german: 'de-DE',
  portugal: 'pt-PT',
  netherlands: 'nl-NL',
  ukrainian: 'uk-UA',
  spanish: 'es-ES',
  french: 'fr-FR'
};

function WordDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [word, setWord] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [newExample, setNewExample] = useState("");
  const [isAddingExample, setIsAddingExample] = useState(false);
  const [accent, setAccent] = useState<'en-US' | 'en-GB'>('en-US');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const speak = () => {
    if (!word) return;
    const utterance = new SpeechSynthesisUtterance(word.text);

    if (word.language === 'english') {
      utterance.lang = accent;
    } else {
      utterance.lang = languageMap[word.language] || 'en-US';
    }

    window.speechSynthesis.speak(utterance);
  };

  const fetchWordDetails = useCallback(() => {
    setLoading(true);
    api.get<WordDetail>(`/words/${id}`)
      .then((data) => {
        setWord(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchWordDetails();
  }, [fetchWordDetails]);

  const handleDeleteWord = () => {
    if (window.confirm("Are you sure you want to delete this word?")) {
      api.delete(`/words/${id}`)
        .then(() => navigate(-1))
        .catch((err) => console.error('Failed to delete word:', err));
    }
  };

  const handleUpdateWord = (object: any) => {
    api.patch<WordDetail>(`/words/${id}`, {
      text: object.field1,
      translate: object.field2,
      extraForms: object.extraFields?.filter((f: string) => f.trim() !== "") || [],
      remembered: object.remembered ?? word?.remembered
    })
      .then((data) => {
        setWord(data);
        setEditModal(false);
      })
      .catch((err) => console.error('Failed to update word:', err));
    return true;
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      api.post<WordDetail>(`/words/${id}/examples`, { example: newExample })
        .then((data) => {
          setWord(data);
          setNewExample("");
          setIsAddingExample(false);
        })
        .catch((err) => console.error('Failed to add example:', err));
    }
  };

  const handleDeleteExample = (index: number) => {
    api.delete<WordDetail>(`/words/${id}/examples/${index}`)
      .then((data) => setWord(data))
      .catch((err) => console.error('Failed to delete example:', err));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}.${m}.${y} (${h}:${min})`;
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500">Loading...</div>;
  if (!word) return <div className="flex justify-center items-center h-screen text-slate-500">Word not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-200 p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full">

        <div className="flex justify-between items-center mb-10">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            <FaArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-4">
            {word.language === 'english' ? (
              <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 gap-1">
                <button
                  onClick={() => setAccent('en-US')}
                  className={`w-10 h-7 rounded-lg overflow-hidden transition-all flex items-center justify-center border-2 ${accent === 'en-US' ? 'border-sky-500 scale-110 shadow-lg shadow-sky-500/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  title="American English"
                >
                  <img src="/public/usa.png" alt="US" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://flagcdn.com/w40/us.png' }} />
                </button>
                <button
                  onClick={() => setAccent('en-GB')}
                  className={`w-10 h-7 rounded-lg overflow-hidden transition-all flex items-center justify-center border-2 ${accent === 'en-GB' ? 'border-sky-500 scale-110 shadow-lg shadow-sky-500/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  title="British English"
                >
                  <img src="/public/english.png" alt="UK" className="w-full h-full object-cover" />
                </button>
              </div>
            ) : (
              <div className="w-10 h-7 rounded-lg overflow-hidden border border-slate-700 shadow-lg">
                <img
                  src={`/public/${word.language}.${word.language === 'german' ? 'svg' : 'png'}`}
                  alt={word.language}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const langCodeMap: {[key: string]: string} = {
                        french: 'fr', spanish: 'es', portugal: 'pt', netherlands: 'nl', ukrainian: 'ua'
                    };
                    const code = langCodeMap[word.language];
                    if (code) e.currentTarget.src = `https://flagcdn.com/w40/${code}.png`;
                  }}
                />
              </div>
            )}

            <button
              onClick={speak}
              className="p-3 bg-sky-600/20 text-sky-400 rounded-full hover:bg-sky-600/40 transition-all hover:scale-110 active:scale-95"
              title={`Listen ${word.language} pronunciation`}
            >
              <FaVolumeUp size={18} />
            </button>
          </div>

          <div className="w-10"></div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl shadow-2xl mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500/50"></div>

          <div className="absolute top-4 right-4" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-all ${isMenuOpen ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FaEllipsisV size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={() => { setEditModal(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-slate-300 transition-colors border-b border-slate-700 text-left"
                >
                  <FaEdit size={14} className="text-sky-400" />
                  <span className="text-sm font-medium">Edit Word</span>
                </button>
                <button
                  onClick={() => { handleDeleteWord(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 text-rose-500 transition-colors text-left"
                >
                  <FaTrash size={14} />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start pr-12">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
              {word.text}
            </h1>
            <h2 className="text-xl md:text-3xl font-normal text-sky-400 mb-6 tracking-normal">
              {word.translate}
            </h2>

            {word.extraForms && word.extraForms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {word.extraForms.map((form, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-700/30 rounded-lg text-base italic text-slate-400 border border-slate-600/20">
                    {form}
                  </span>
                ))}
              </div>
            )}

            {word.remembered && (
                <div className="mt-6 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    Learned
                </div>
            )}
          </div>

          <div className="absolute bottom-6 right-8 text-slate-600 font-mono text-[13px] md:text-xs">
            {formatDate(word.createdAt)}
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              Examples
              <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md">
                {word.examples?.length || 0}
              </span>
            </h3>
            {!isAddingExample && (
              <button
                onClick={() => setIsAddingExample(true)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-colors font-bold text-sm"
              >
                <FaPlus size={12} /> Add
              </button>
            )}
          </div>

          {isAddingExample && (
            <div className="mb-6 flex gap-2">
              <input
                autoFocus
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="Write a sentence with this word..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddExample()}
              />
              <button
                onClick={handleAddExample}
                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors"
              >
                <FaCheck size={18} />
              </button>
              <button
                onClick={() => { setIsAddingExample(false); setNewExample(""); }}
                className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>
          )}

          <div className="space-y-4">
            {word.examples && word.examples.length > 0 ? (
              word.examples.map((ex, i) => (
                <div key={i} className="group flex justify-between items-center bg-slate-900/40 border border-slate-700/30 p-4 rounded-2xl hover:bg-slate-900 transition-colors">
                  <p className="text-lg text-slate-300 leading-relaxed italic">
                    "{ex}"
                  </p>
                  <button
                    onClick={() => handleDeleteExample(i)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:text-rose-400 transition-all"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic text-center py-10 bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-700/30">
                No examples added yet. Add some sentences to help you remember the word!
              </p>
            )}
          </div>
        </div>
      </div>

      {editModal && (
        <Modal
          name="Edit word"
          input1='Original'
          input2='Translation'
          input2Type="input"
          placeholder1={word.text}
          buttonText="Save"
          onClose={() => setEditModal(false)}
          onCreate={handleUpdateWord}
          defaultValue1={word.text}
          defaultValue2={word.translate}
          defaultExtraFields={word.extraForms}
          defaultRemembered={word.remembered}
        />
      )}
    </div>
  );
}

export default WordDetails;
