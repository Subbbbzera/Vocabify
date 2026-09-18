import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaEdit, FaPlus, FaCheck, FaTimes, FaVolumeUp, FaEllipsisV } from "react-icons/fa";
import Modal from "../components/Modal";
import { api } from "../services/api";

type WordDetail = {
  id: number;
  text: string;
  translate: string;
  transcription?: string;
  partOfSpeech?: string;
  extraForms: string[];
  examples: any[];
  createdAt: string;
  remembered: boolean;
  dictionaryId: number;
  language: string;
  nextReviewDate?: string | null;
  interval?: number;
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
  const [isAddingExample, setIsAddingExample] = useState(false);
  const [newExample, setNewExample] = useState("");
  
  const [editingExampleIndex, setEditingExampleIndex] = useState<number | null>(null);
  const [editExampleText, setEditExampleText] = useState("");
  
  const [accent] = useState<'en-US' | 'en-GB'>('en-US');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [transcription, setTranscription] = useState<string>('');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const speak = (textToSpeak?: string) => {
    if (!word) return;
    const text = textToSpeak || word.text;
    const utterance = new SpeechSynthesisUtterance(text);

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

  // Fetch real transcription from Dictionary API if missing
  useEffect(() => {
    if (word) {
      if (word.transcription) {
        setTranscription(word.transcription);
      } else {
        setTranscription('');
      }
      
      if (word.partOfSpeech) {
        setPartOfSpeech(word.partOfSpeech);
      } else {
        setPartOfSpeech('');
      }
    }
  }, [word]);

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
      transcription: object.transcription,
      partOfSpeech: object.partOfSpeech,
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

  const startEditingExample = (index: number, ex: any) => {
    setEditingExampleIndex(index);
    setEditExampleText(typeof ex === 'string' ? ex : ex.text || "");
  };

  const handleSaveEdit = () => {
    if (editingExampleIndex !== null && editExampleText.trim()) {
      api.patch<WordDetail>(`/words/${id}/examples/${editingExampleIndex}`, { example: editExampleText })
        .then((data) => {
          setWord(data);
          setEditingExampleIndex(null);
          setEditExampleText("");
        })
        .catch((err) => console.error('Failed to update example:', err));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}.${m}.${y}`;
  };

  const highlightTargetWord = (sentence: string, target: string) => {
    if (!sentence || !target) return sentence;
    const regex = new RegExp(`(${target})`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === target.toLowerCase() 
        ? <strong key={i} className="text-white font-bold">{part}</strong> 
        : part
    );
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-slate-900 text-slate-500">Loading...</div>;
  if (!word) return <div className="flex justify-center items-center h-screen bg-slate-900 text-slate-500">Word not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-6 md:p-8 md:ml-[250px] lg:ml-[280px]">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Main Dictionary Entry */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <FaArrowLeft size={16} />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2.5 rounded-full transition-all ${isMenuOpen ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <FaEllipsisV size={16} />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { setEditModal(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-slate-300 transition-colors text-left"
                  >
                    <FaEdit size={14} className="text-blue-400" />
                    <span className="text-sm font-medium">Edit</span>
                  </button>
                  <button
                    onClick={() => { handleDeleteWord(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 text-rose-500 transition-colors text-left border-t border-slate-700"
                  >
                    <FaTrash size={14} />
                    <span className="text-sm font-medium">Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Word */}
          <div className="flex items-start justify-between mb-3 gap-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black text-white tracking-tight leading-tight break-words min-w-0 flex-1">
              {word.text}
            </h1>
            <button
              onClick={() => speak()}
              className="mt-2 p-3 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500/20 transition-all hover:scale-110 active:scale-95 shrink-0"
              title="Listen"
            >
              <FaVolumeUp size={18} />
            </button>
          </div>

          {/* Typography: transcription, pos, level */}
          <div className="flex flex-wrap items-center gap-3 text-base md:text-lg font-serif text-slate-400 mb-8 pb-6 border-b border-slate-700/50">
            {transcription && (
              <>
                <span className="italic">{transcription}</span>
                <span className="text-slate-600">·</span>
              </>
            )}
            {partOfSpeech && (
              <>
                <span>{partOfSpeech}</span>
                <span className="text-slate-600">·</span>
              </>
            )}
            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-sans tracking-wide uppercase">B2</span>
          </div>

          {/* Translation */}
          <div className="mb-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Переклад</h3>
            <h2 className="text-2xl md:text-3xl font-medium text-blue-400 break-words">
              {word.translate}
            </h2>
            
            {word.extraForms && word.extraForms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {word.extraForms.map((form, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-sm italic text-slate-300">
                    {form}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Examples */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white font-serif">Examples</h3>
              {!isAddingExample && (
                <button
                  onClick={() => setIsAddingExample(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                >
                  <FaPlus size={10} /> Add
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
                  placeholder="Write a sentence..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExample()}
                />
                <button onClick={handleAddExample} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors">
                  <FaCheck size={16} />
                </button>
                <button onClick={() => { setIsAddingExample(false); setNewExample(""); }} className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                  <FaTimes size={16} />
                </button>
              </div>
            )}

            {/* Examples List */}
            <div className="space-y-3">
              {word.examples && word.examples.length > 0 ? (
                word.examples.map((ex, i) => {
                  const text = typeof ex === 'string' ? ex : ex.text;
                  return (
                    <div key={i} className="group relative bg-slate-800/20 rounded-2xl p-5 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                      {editingExampleIndex === i ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editExampleText}
                            onChange={(e) => setEditExampleText(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          />
                          <button onClick={handleSaveEdit} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500">
                            <FaCheck size={14} />
                          </button>
                          <button onClick={() => { setEditingExampleIndex(null); setEditExampleText(""); }} className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600">
                            <FaTimes size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4 pr-12">
                          <button 
                            onClick={() => speak(text)} 
                            className="mt-1 text-slate-500 hover:text-blue-400 shrink-0 transition-colors"
                            title="Listen to example"
                          >
                            <FaVolumeUp size={14} />
                          </button>
                          <p className="text-lg text-slate-300 leading-relaxed font-serif italic">
                            "{highlightTargetWord(text, word.text)}"
                          </p>
                          
                          {/* Hover actions */}
                          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditingExample(i, ex)}
                              className="p-2 text-slate-400 hover:text-blue-400 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <FaEdit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteExample(i)}
                              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-slate-500 italic font-serif">No examples yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Character / Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6 pt-2 lg:pt-16">
          
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-[2rem] p-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Learning Progress</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Status</span>
                {word.remembered ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5"><FaCheck size={12}/> Mastered</span>
                ) : (
                  <span className="text-amber-400 font-medium text-sm">Learning</span>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Next Review</span>
                <span className="text-slate-200 text-sm font-medium">{word.nextReviewDate ? formatDate(word.nextReviewDate) : 'Not scheduled'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Interval</span>
                <span className="text-slate-200 text-sm font-medium">{word.interval ? `${word.interval} days` : '0 days'}</span>
              </div>
              
              <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center">
                <span className="text-xs text-slate-500">Added to dictionary</span>
                <span className="text-xs text-slate-500">{formatDate(word.createdAt)}</span>
              </div>
            </div>
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
          defaultTranscription={word.transcription}
          defaultPartOfSpeech={word.partOfSpeech}
          defaultExtraFields={word.extraForms}
          defaultRemembered={word.remembered}
        />
      )}
    </div>
  );
}

export default WordDetails;
