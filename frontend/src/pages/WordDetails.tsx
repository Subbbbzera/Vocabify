import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaTrash, FaEdit, FaPlus, FaCheck, FaTimes, FaVolumeUp, FaEllipsisV, FaImage, FaEye, FaEyeSlash, FaSearchPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Modal from "../components/Modal";
import { api } from "../services/api";

type WordDetail = {
  id: number;
  text: string;
  translate: string;
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
  const [newExample, setNewExample] = useState("");
  const [newExampleImages, setNewExampleImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingExample, setIsAddingExample] = useState(false);
  const [editingExampleIndex, setEditingExampleIndex] = useState<number | null>(null);
  const [editExampleText, setEditExampleText] = useState("");
  const [editExampleImages, setEditExampleImages] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [zoomedState, setZoomedState] = useState<{ images: string[]; index: number } | null>(null);
  const [hiddenImageBlocks, setHiddenImageBlocks] = useState<number[]>([]);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!zoomedState) return;
      if (e.key === 'Escape') {
        setZoomedState(null);
      } else if (e.key === 'ArrowLeft') {
        setZoomedState(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null);
      } else if (e.key === 'ArrowRight') {
        setZoomedState(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null);
      }
    };
    if (zoomedState) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomedState]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewExampleImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddExample = () => {
    if (newExample.trim() || newExampleImages.length > 0) {
      const examplePayload = newExampleImages.length > 0 
        ? { text: newExample, images: newExampleImages } 
        : newExample;
      api.post<WordDetail>(`/words/${id}/examples`, { example: examplePayload })
        .then((data) => {
          setWord(data);
          setNewExample("");
          setNewExampleImages([]);
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
    if (typeof ex === 'string') {
      setEditExampleText(ex);
      setEditExampleImages([]);
    } else {
      setEditExampleText(ex.text || "");
      if (ex.images && Array.isArray(ex.images)) {
        setEditExampleImages(ex.images);
      } else if (ex.image) {
        setEditExampleImages([ex.image]);
      } else {
        setEditExampleImages([]);
      }
    }
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditExampleImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveEdit = () => {
    if (editingExampleIndex !== null && (editExampleText.trim() || editExampleImages.length > 0)) {
      const examplePayload = editExampleImages.length > 0 
        ? { text: editExampleText, images: editExampleImages } 
        : editExampleText;
      api.patch<WordDetail>(`/words/${id}/examples/${editingExampleIndex}`, { example: examplePayload })
        .then((data) => {
          setWord(data);
          setEditingExampleIndex(null);
          setEditExampleText("");
          setEditExampleImages([]);
        })
        .catch((err) => console.error('Failed to update example:', err));
    }
  };

  const toggleHideImageBlock = (index: number) => {
    setHiddenImageBlocks(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
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
      <div className="max-w-5xl mx-auto w-full">

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

        <div className="bg-slate-800 border border-slate-700 p-8 md:p-12 rounded-[2.5rem] shadow-xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-sky-500"></div>

          <div className="absolute top-6 right-6" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2.5 rounded-full transition-all ${isMenuOpen ? 'bg-slate-700 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <FaEllipsisV size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={() => { setEditModal(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700 text-slate-300 transition-colors border-b border-slate-700 text-left"
                >
                  <FaEdit size={14} className="text-sky-400" />
                  <span className="text-sm font-medium">Edit Word</span>
                </button>
                <button
                  onClick={() => { handleDeleteWord(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-rose-500/10 text-rose-500 transition-colors text-left"
                >
                  <FaTrash size={14} />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start pr-14 mt-2">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-3 tracking-tight flex items-baseline gap-4">
              {word.text}
              <span className="text-sm md:text-base font-normal text-slate-500 uppercase tracking-widest">{word.language}</span>
            </h1>
            <h2 className="text-2xl md:text-4xl font-semibold text-sky-400 mb-8 tracking-wide">
              {word.translate}
            </h2>

            {word.extraForms && word.extraForms.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-2">
                {word.extraForms.map((form, i) => (
                  <span key={i} className="px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-base italic text-slate-300 shadow-sm">
                    {form}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              {word.remembered && (
                <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                  Learned
                </div>
              )}
              {word.nextReviewDate && (
                <div className="px-4 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                  Review: {formatDate(word.nextReviewDate)}
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-6 right-8 text-slate-500/70 font-mono text-[11px] md:text-xs">
            {formatDate(word.createdAt)}
          </div>
        </div>

        <div className="bg-transparent px-4 md:px-8 pb-12">
          <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-4">
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
              Examples
              <span className="text-xs font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-0.5 rounded-full">
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
            <div className="mb-6 flex flex-col gap-3">
              <div className="flex gap-2">
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
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                  title="Add Image"
                >
                  <FaImage size={18} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={handleAddExample}
                  className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors"
                >
                  <FaCheck size={18} />
                </button>
                <button
                  onClick={() => { setIsAddingExample(false); setNewExample(""); setNewExampleImages([]); }}
                  className="p-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                >
                  <FaTimes size={18} />
                </button>
              </div>
              {newExampleImages.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-2">
                  {newExampleImages.map((img, idx) => (
                    <div key={idx} className="relative self-start">
                      <img src={img} alt="Example" className="w-32 h-32 object-cover rounded-xl border border-slate-600 shadow-md" />
                      <button
                        onClick={() => setNewExampleImages(prev => prev.filter((_, idx2) => idx2 !== idx))}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition-colors shadow-sm"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {word.examples && word.examples.length > 0 ? (
              word.examples.map((ex, i) => {
                const text = typeof ex === 'string' ? ex : ex.text;
                const imagesArray: string[] = typeof ex === 'string' ? [] : (ex.images && Array.isArray(ex.images) ? ex.images : (ex.image ? [ex.image] : []));
                return (
                  <div key={i} className="group flex flex-col gap-4 bg-slate-900/20 border-l-4 border-slate-700 hover:border-sky-500 hover:bg-slate-800/40 pl-6 pr-4 py-5 rounded-r-2xl transition-all shadow-sm">
                    {editingExampleIndex === i ? (
                      <div className="flex flex-col gap-3 w-full">
                        <div className="flex gap-2 w-full">
                          <input
                            autoFocus
                            type="text"
                            value={editExampleText}
                            onChange={(e) => setEditExampleText(e.target.value)}
                            placeholder="Edit example..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-sky-500 transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          />
                          <button
                            onClick={() => editFileInputRef.current?.click()}
                            className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                            title="Edit Image"
                          >
                            <FaImage size={16} />
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={editFileInputRef}
                            onChange={handleEditImageUpload}
                            className="hidden"
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors"
                          >
                            <FaCheck size={16} />
                          </button>
                          <button
                            onClick={() => { setEditingExampleIndex(null); setEditExampleText(""); setEditExampleImages([]); }}
                            className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                          >
                            <FaTimes size={16} />
                          </button>
                        </div>
                        {editExampleImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-2">
                            {editExampleImages.map((img, idx) => (
                              <div key={idx} className="relative self-start">
                                <img src={img} alt="Example" className="w-24 h-24 object-cover rounded-xl border border-slate-600 shadow-md" />
                                <button
                                  onClick={() => setEditExampleImages(prev => prev.filter((_, idx2) => idx2 !== idx))}
                                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 transition-colors shadow-sm"
                                >
                                  <FaTimes size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {text && (
                              <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-serif italic">
                                "{text}"
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            {imagesArray.length > 0 && (
                              <button
                                onClick={() => toggleHideImageBlock(i)}
                                className="p-2 text-slate-400 hover:text-slate-300 transition-colors bg-slate-900/40 rounded-lg hover:bg-slate-800"
                                title={hiddenImageBlocks.includes(i) ? "Show Images" : "Hide Images"}
                              >
                                {hiddenImageBlocks.includes(i) ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                              </button>
                            )}
                            <button
                              onClick={() => startEditingExample(i, ex)}
                              className="p-2 text-sky-500 hover:text-sky-400 transition-colors bg-slate-900/40 rounded-lg hover:bg-slate-800"
                              title="Edit"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteExample(i)}
                              className="p-2 text-rose-500 hover:text-rose-400 transition-colors bg-slate-900/40 rounded-lg hover:bg-slate-800"
                              title="Delete"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </div>

                        {imagesArray.length > 0 && !hiddenImageBlocks.includes(i) && (
                          <div className="mt-2 relative">
                            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-3 hide-scrollbar">
                              {imagesArray.map((img, idx) => (
                                <div key={idx} className="snap-center shrink-0 min-w-[200px] h-[150px] relative group/img">
                                  <img 
                                    src={img} 
                                    alt="Example" 
                                    className="w-full h-full object-cover rounded-xl border border-slate-700/50 shadow-md cursor-pointer transition-transform group-hover/img:brightness-90"
                                    onClick={() => setZoomedState({ images: imagesArray, index: idx })} 
                                  />
                                  <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setZoomedState({ images: imagesArray, index: idx }); }}
                                      className="p-1.5 bg-slate-900/80 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-lg backdrop-blur-sm"
                                      title="Zoom in"
                                    >
                                      <FaSearchPlus size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
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

      {zoomedState && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomedState(null)}
        >
          {zoomedState.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedState(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null);
              }}
              className="absolute left-6 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 p-4 rounded-full transition-all"
            >
              <FaChevronLeft size={32} />
            </button>
          )}

          <img 
            src={zoomedState.images[zoomedState.index]} 
            alt="Zoomed example" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />

          {zoomedState.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedState(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null);
              }}
              className="absolute right-6 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 p-4 rounded-full transition-all"
            >
              <FaChevronRight size={32} />
            </button>
          )}

          <button
            onClick={() => setZoomedState(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 p-3 rounded-full transition-all"
            title="Close (Esc)"
          >
            <FaTimes size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

export default WordDetails;
