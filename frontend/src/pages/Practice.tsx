import { getBackendUrl } from '../services/api'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaXmark, FaVolumeHigh, FaRotateLeft, FaCalendarDays, FaClockRotateLeft, FaLayerGroup, FaBook, FaSliders, FaTrash } from 'react-icons/fa6';
import type { AllWord } from '../types';

type FilterType = 'unlearned' | 'learned' | 'recent' | 'dateRange' | 'all' | 'custom';

function Practice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const practiceMode = (searchParams.get('mode') as 'writing' | 'cards') || 'writing';

  const [allFetchedWords, setAllFetchedWords] = useState<AllWord[]>([]);
  const [words, setWords] = useState<AllWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [direction] = useState<'origToTrans' | 'transToOrig'>('origToTrans');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWritingHint, setShowWritingHint] = useState(false);

  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('unlearned');
  const [recentCount, setRecentCount] = useState(20);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [activeLetters, setActiveLetters] = useState<string[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [presets, setPresets] = useState<{ name: string; activeLetters: string[]; selectedWordIds: number[] }[]>([]);
  const [presetNameInput, setPresetNameInput] = useState('');

  const wordsByLetter = React.useMemo(() => {
    const groups: Record<string, AllWord[]> = {};
    allFetchedWords.forEach(word => {
      const letter = word.text.trim().slice(0, 1).toUpperCase();
      if (!letter) return;
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(word);
    });
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, AllWord[]>);
  }, [allFetchedWords]);

  useEffect(() => {
    if (!id) return;

    const savedSel = localStorage.getItem(`dict_practice_sel_${id}`);
    if (savedSel) {
      try {
        const { activeLetters: savedLetters, selectedWordIds: savedIds } = JSON.parse(savedSel);
        if (allFetchedWords.length > 0) {
          const validIds = savedIds.filter((sid: number) => allFetchedWords.some(w => w.id === sid));
          setSelectedWordIds(validIds);
          setActiveLetters(savedLetters || []);
        }
      } catch (e) {
        console.error("Error parsing saved custom selection", e);
      }
    }
  }, [id, allFetchedWords]);

  useEffect(() => {
    if (!id) return;
    if (allFetchedWords.length === 0) return;

    const selState = { activeLetters, selectedWordIds };
    localStorage.setItem(`dict_practice_sel_${id}`, JSON.stringify(selState));
  }, [id, activeLetters, selectedWordIds, allFetchedWords]);

  useEffect(() => {
    if (!id) return;
    const savedPresets = localStorage.getItem(`dict_practice_presets_${id}`);
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error("Error parsing presets", e);
      }
    }
  }, [id]);

  const savePreset = () => {
    if (!presetNameInput.trim()) {
      alert("Please enter a preset name!");
      return;
    }
    if (selectedWordIds.length === 0) {
      alert("Cannot save an empty preset! Please select at least one word.");
      return;
    }

    const newPreset = {
      name: presetNameInput.trim(),
      activeLetters: [...activeLetters],
      selectedWordIds: [...selectedWordIds]
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem(`dict_practice_presets_${id}`, JSON.stringify(updatedPresets));
    setPresetNameInput('');
  };

  const loadPreset = (preset: typeof presets[0]) => {
    const validIds = preset.selectedWordIds.filter(sid => allFetchedWords.some(w => w.id === sid));
    setActiveLetters(preset.activeLetters);
    setSelectedWordIds(validIds);
  };

  const deletePreset = (index: number) => {
    const updatedPresets = presets.filter((_, i) => i !== index);
    setPresets(updatedPresets);
    localStorage.setItem(`dict_practice_presets_${id}`, JSON.stringify(updatedPresets));
  };

  const toggleLetter = (letter: string) => {
    const letterWords = wordsByLetter[letter] || [];
    const wordIds = letterWords.map(w => w.id);
    const isActive = activeLetters.includes(letter);

    if (isActive) {
      setActiveLetters(prev => prev.filter(l => l !== letter));
      setSelectedWordIds(prev => prev.filter(id => !wordIds.includes(id)));
    } else {
      setActiveLetters(prev => [...prev, letter]);
      setSelectedWordIds(prev => {
        const next = [...prev];
        wordIds.forEach(id => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      });
    }
  };

  const selectAllCustom = () => {
    const allLetters = Object.keys(wordsByLetter);
    setActiveLetters(allLetters);
    const allIds = allFetchedWords.map(w => w.id);
    setSelectedWordIds(allIds);
  };

  const clearCustom = () => {
    setActiveLetters([]);
    setSelectedWordIds([]);
  };

  const [isFlipped, setIsFlipped] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  const setPracticeMode = (mode: 'writing' | 'cards') => {
    setSearchParams({ mode }, { replace: true });
  };

  const getUserId = () => {
    const saved = localStorage.getItem('sessionUser');
    if (saved) return JSON.parse(saved).id;
    return null;
  }

  const fetchWords = useCallback(() => {
    if (!id) return;
    const userId = getUserId();
    fetch(getBackendUrl(`/word/getWord/${id}`), {
      headers: { "user-id": userId?.toString() || "" }
    })
      .then(res => res.json())
      .then(data => {
        const flat: AllWord[] = Object.values(data).flat() as AllWord[];
        setAllFetchedWords(flat);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const startPractice = () => {
    let filtered = [...allFetchedWords];

    if (filterType === 'unlearned') {
      filtered = filtered.filter(w => !w.remembered);
    } else if (filterType === 'learned') {
      filtered = filtered.filter(w => w.remembered);
    } else if (filterType === 'recent') {

      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      }).slice(0, recentCount);
    } else if (filterType === 'dateRange') {
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(w => new Date(w.createdAt || 0).getTime() >= start.getTime());
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(w => new Date(w.createdAt || 0).getTime() <= end.getTime());
      }
    } else if (filterType === 'custom') {
      if (selectedWordIds.length === 0) {
        alert("Please select at least one word to practice!");
        return;
      }
      filtered = filtered.filter(w => selectedWordIds.includes(w.id));
    }

    if (filtered.length === 0) {
      alert("No words found for this selection!");
      return;
    }

    setWords(filtered.sort(() => Math.random() - 0.5));
    setIsSetupOpen(false);
    setCurrentIndex(0);

    const userId = getUserId();
    if (userId) {
      fetch(getBackendUrl("/auth/record-practice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })
      .then(res => res.json())
      .then(updatedUser => {
        localStorage.setItem('sessionUser', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage'));
      });
    }
  }

  const currentWord = words[currentIndex];

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US');
    if (usVoice) utterance.voice = usVoice;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  const markAsLearned = async (word: AllWord) => {
    const userId = getUserId();
    try {
      await fetch(getBackendUrl(`/word/update/${word.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId?.toString() || ""
        },
        body: JSON.stringify({ remembered: true })
      });
    } catch (error) {
      console.error('Error updating word:', error);
    }
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || isCorrect !== null) return;

    const target = direction === 'origToTrans' ? currentWord.translate : currentWord.text;
    const isAnswerCorrect = inputValue.trim().toLowerCase() === target.toLowerCase();

    if (isAnswerCorrect) {
      setIsCorrect(true);
      markAsLearned(currentWord).then(() => {
        setTimeout(() => nextWord(true), 1000);
      });
    } else {
      setIsCorrect(false);
      setTimeout(() => {
        setIsCorrect(null);
        nextWord(true);
      }, 1000);
    }
  };

  const nextWord = (wasProcessed: boolean) => {
    if (wasProcessed) {
      const newWords = words.filter((_, i) => i !== currentIndex);
      setWords(newWords);
      if (currentIndex >= newWords.length && newWords.length > 0) {
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }
    setInputValue('');
    setIsCorrect(null);
    setIsFlipped(false);
    setDragOffset(0);
  };

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (practiceMode !== 'cards' || isCorrect !== null) return;
    setIsDragging(true);
    dragStartX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
  };

  const onDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = currentX - dragStartX.current;
    setDragOffset(offset);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset > 100) {
      setIsCorrect(true);
      markAsLearned(currentWord).then(() => {
        setTimeout(() => nextWord(true), 1000);
      });
    } else if (dragOffset < -100) {
      setIsCorrect(false);
      setTimeout(() => {
        nextWord(true);
      }, 1000);
    } else {
      setDragOffset(0);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-[0.3em]">Loading words...</div>;

  if (isSetupOpen) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className={`w-full transition-all duration-300 bg-slate-800 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-300 ${filterType === 'custom' ? 'max-w-3xl' : 'max-w-lg'}`}>
          <div className="text-center space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-tight">Session Setup</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Choose what you want to practice</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: 'unlearned', label: 'Unlearned Only', icon: <FaClockRotateLeft /> },
              { id: 'recent', label: 'Recently Added', icon: <FaLayerGroup /> },
              { id: 'learned', label: 'Learned Only', icon: <FaCheck /> },
              { id: 'dateRange', label: 'Date Range', icon: <FaCalendarDays /> },
              { id: 'all', label: 'All Words', icon: <FaBook /> },
              { id: 'custom', label: 'Custom Selection', icon: <FaSliders /> }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilterType(opt.id as FilterType)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all group ${filterType === opt.id ? 'bg-sky-500/10 border-sky-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${filterType === opt.id ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                  {opt.icon}
                </div>
                <span className="font-bold uppercase text-xs tracking-wider text-left">{opt.label}</span>
              </button>
            ))}
          </div>

          {filterType === 'recent' && (
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700 space-y-3 animate-in slide-in-from-top-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">How many words?</p>
              <div className="flex gap-2">
                {[10, 20, 50, 100].map(n => (
                  <button key={n} onClick={() => setRecentCount(n)} className={`flex-1 py-2.5 rounded-lg font-black text-xs transition-all ${recentCount === n ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {filterType === 'dateRange' && (
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">From</p>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">To</p>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>
          )}

          {filterType === 'custom' && (
            <div className="p-3 md:p-4 bg-slate-900/50 rounded-xl border border-slate-700 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Stacks (Letters)</p>
                  <p className="text-[9px] text-slate-600 font-bold ml-1 mt-0.5">Toggle letters to view and select words under them</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={selectAllCustom}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-300 rounded-lg uppercase tracking-wider transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearCustom}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-300 rounded-lg uppercase tracking-wider transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-3 pb-3 border-b border-slate-800/80">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Templates / Presets</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Preset name (e.g. Verbs, Lesson 1)..."
                    value={presetNameInput}
                    onChange={e => setPresetNameInput(e.target.value)}
                    className="flex-1 bg-slate-950/40 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={savePreset}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-[10px] font-black text-white rounded-xl uppercase tracking-wider transition-colors"
                  >
                    Save Preset
                  </button>
                </div>

                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {presets.map((preset, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl px-2.5 py-1 transition-all hover:border-slate-700"
                      >
                        <button
                          type="button"
                          onClick={() => loadPreset(preset)}
                          className="text-xs font-bold text-slate-300 hover:text-sky-400 transition-colors uppercase tracking-wide flex items-center gap-1.5"
                        >
                          <span>{preset.name}</span>
                          <span className="text-[9px] text-slate-500">({preset.selectedWordIds.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePreset(idx)}
                          className="p-1 text-slate-600 hover:text-rose-500 transition-colors rounded-lg"
                          title="Delete Template"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.keys(wordsByLetter).length === 0 ? (
                  <p className="text-slate-500 text-xs italic ml-1">No words available in this dictionary</p>
                ) : (
                  Object.keys(wordsByLetter).map(letter => {
                    const letterWords = wordsByLetter[letter] || [];
                    const wordIds = letterWords.map(w => w.id);
                    const selectedCount = wordIds.filter(id => selectedWordIds.includes(id)).length;
                    const totalCount = letterWords.length;

                    const isFullySelected = selectedCount === totalCount;
                    const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;
                    const isActive = activeLetters.includes(letter);

                    let btnClass = "bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700";
                    if (isFullySelected) {
                      btnClass = "bg-sky-500/20 border-sky-500 text-sky-400 font-black";
                    } else if (isPartiallySelected) {
                      btnClass = "bg-sky-500/10 border-sky-500/50 text-sky-300 font-bold";
                    } else if (isActive) {
                      btnClass = "bg-slate-800 border-slate-700 text-slate-300";
                    }

                    return (
                      <button
                        type="button"
                        key={letter}
                        onClick={() => toggleLetter(letter)}
                        className={`px-3 py-2 rounded-xl border text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 select-none ${btnClass}`}
                      >
                        <span className="font-extrabold text-sm">{letter}</span>
                        <span className="text-[9px] opacity-60">({selectedCount}/{totalCount})</span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Words List ({selectedWordIds.length} selected)
                </p>

                <div className="max-h-60 overflow-y-auto border border-slate-800/60 bg-slate-950/20 rounded-xl p-3 space-y-4 custom-scrollbar">
                  {[...activeLetters].sort().length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      Select letters above to see their words
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...activeLetters].sort().map(letter => {
                        const letterWords = wordsByLetter[letter] || [];
                        return (
                          <div key={letter} className="space-y-2">
                            <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest border-b border-slate-800 pb-1 flex justify-between">
                              <span>Letter {letter}</span>
                              <span className="text-[9px] text-slate-500 font-bold">
                                {letterWords.filter(w => selectedWordIds.includes(w.id)).length} of {letterWords.length} selected
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {letterWords.map(word => {
                                const isWordSelected = selectedWordIds.includes(word.id);
                                return (
                                  <label
                                    key={word.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                      isWordSelected
                                        ? 'bg-slate-800/80 border-sky-500/30 text-white shadow-sm'
                                        : 'bg-slate-900/20 border-slate-800/50 text-slate-400 hover:border-slate-700/50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isWordSelected}
                                      onChange={() => {
                                        setSelectedWordIds(prev =>
                                          prev.includes(word.id)
                                            ? prev.filter(id => id !== word.id)
                                            : [...prev, word.id]
                                        );
                                      }}
                                      className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700 focus:ring-sky-500 focus:ring-offset-slate-900 focus:ring-2"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-sm truncate">{word.text}</p>
                                      <p className="text-xs text-slate-400 truncate">{word.translate}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button onClick={() => navigate(-1)} className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs transition-all">Cancel</button>
            <button onClick={startPractice} className="flex-[2] py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs shadow-xl shadow-sky-900/20 transition-all">Start Session</button>
          </div>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-slate-900 items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center text-emerald-400 mb-6 border-2 border-emerald-500/20 rotate-3">
           <FaCheck size={32} className="-rotate-3"/>
        </div>
        <h2 className="text-4xl font-black mb-2 text-emerald-400 uppercase tracking-tighter">DONE!</h2>
        <p className="text-slate-400 mb-8 uppercase tracking-widest font-bold text-xs">All selected words have been practiced.</p>
        <div className="flex gap-4">
           <button onClick={() => setIsSetupOpen(true)} className="px-8 py-4 bg-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2">
             <FaRotateLeft /> Restart
           </button>
           <button onClick={() => navigate(-1)} className="px-8 py-4 bg-sky-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-500 transition-all flex items-center gap-2 shadow-lg shadow-sky-900/20">
             <FaArrowLeft /> Go Back
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4 md:p-8 relative overflow-hidden">

      <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full relative z-[70]">
        <button onClick={() => navigate(-1)} className="p-3 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
          <FaArrowLeft size={20} />
        </button>

        <div className="flex bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setPracticeMode('writing')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${practiceMode === 'writing' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Writing
          </button>
          <button
            onClick={() => setPracticeMode('cards')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${practiceMode === 'cards' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Cards
          </button>
        </div>

        <div className="w-10"></div>
      </div>

      <div className="flex flex-col items-center mb-6">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Words Left</span>
        <span className="text-3xl font-black text-white">{words.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full relative">

        {practiceMode === 'writing' ? (
          <div className={`w-full bg-slate-800/50 border-2 p-8 md:p-14 rounded-[3rem] shadow-2xl backdrop-blur-sm text-center relative overflow-hidden transition-all duration-300 ${isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-500' : 'border-slate-700'}`}>
            <div className={`absolute inset-0 transition-opacity duration-500 ${isCorrect === true ? 'bg-emerald-500/10 opacity-100' : isCorrect === false ? 'bg-rose-500/10 opacity-100' : 'opacity-0'}`}></div>

            <div className="flex justify-between items-center mb-10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                {direction === 'origToTrans' ? 'Translate' : 'Original'}
              </span>
              <button onClick={() => speak(direction === 'origToTrans' ? currentWord.text : currentWord.translate)} className="text-slate-500 hover:text-sky-400 transition-colors">
                <FaVolumeHigh size={20} />
              </button>
            </div>

            <div
              className="cursor-pointer group relative mb-14"
              onClick={() => setShowWritingHint(!showWritingHint)}
            >
              <h1 className="text-4xl md:text-5xl font-black text-white break-words transition-all group-hover:text-sky-400 leading-tight">
                {direction === 'origToTrans' ? currentWord.text : currentWord.translate}
              </h1>
              <div className={`mt-4 transition-all duration-300 ${showWritingHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                <span className="text-lg font-bold text-sky-400 italic">
                  {direction === 'origToTrans' ? currentWord.translate : currentWord.text}
                </span>
              </div>
              {!showWritingHint && <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-2">Tap for hint</p>}
            </div>

            <form onSubmit={handleCheck} className="relative">
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type answer..."
                className={`w-full bg-slate-900/50 border-2 py-4 px-8 rounded-2xl text-2xl font-black text-center text-white outline-none transition-all duration-300 placeholder:text-slate-700
                  ${isCorrect === true ? 'border-emerald-500' :
                    isCorrect === false ? 'border-rose-500 animate-shake' :
                    'border-slate-700 focus:border-sky-500 shadow-inner'}`}
              />

              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => nextWord(false)} className="flex-1 py-5 bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-700 transition-all">Skip</button>
                <button type="submit" className="flex-1 py-5 bg-sky-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-900/20">Check</button>
              </div>
            </form>
          </div>
        ) : (

          <div
            className="w-full h-[550px] perspective-1000 cursor-grab active:cursor-grabbing"
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
          >
            <div
              className={`relative w-full h-full transition-transform duration-100 ease-out`}
              style={{
                transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
                opacity: 1 - Math.abs(dragOffset) / 500
              }}
            >

              <div className={`absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity ${dragOffset > 50 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="p-5 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-900/40"><FaCheck size={36}/></div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Know</span>
              </div>
              <div className={`absolute -left-24 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-opacity ${dragOffset < -50 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="p-5 bg-rose-500 text-white rounded-full shadow-lg shadow-rose-900/40"><FaXmark size={36}/></div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Learn</span>
              </div>

              <div
                onClick={() => !isDragging && setIsFlipped(!isFlipped)}
                className={`w-full h-full relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
              >

                <div className={`absolute inset-0 backface-hidden bg-slate-800 border-2 rounded-[3rem] flex flex-col items-center justify-center p-12 shadow-2xl transition-all duration-300 ${isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-500' : 'border-slate-700'}`}>
                  <span className="absolute top-10 text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Question</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(direction === 'origToTrans' ? currentWord.text : currentWord.translate); }}
                    className="absolute top-10 right-10 p-4 text-slate-500 hover:text-white transition-colors"
                  >
                    <FaVolumeHigh size={28}/>
                  </button>
                  <h2 className="text-5xl font-black text-white text-center leading-tight">
                    {direction === 'origToTrans' ? currentWord.text : currentWord.translate}
                  </h2>
                  <p className="absolute bottom-12 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] animate-pulse">Tap to reveal</p>
                </div>

                <div className={`absolute inset-0 backface-hidden bg-slate-700 border-2 rounded-[3rem] flex flex-col items-center justify-center p-12 shadow-2xl rotate-y-180 transition-all duration-300 ${isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-500' : 'border-sky-500/50'}`}>
                  <span className="absolute top-10 text-[10px] font-black text-sky-400/60 uppercase tracking-[0.5em]">Translation</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); speak(direction === 'origToTrans' ? currentWord.translate : currentWord.text); }}
                    className="absolute top-10 right-10 p-4 text-sky-400 hover:text-white transition-colors"
                  >
                    <FaVolumeHigh size={28}/>
                  </button>
                  <h2 className="text-5xl font-black text-white text-center leading-tight">
                    {direction === 'origToTrans' ? currentWord.translate : currentWord.text}
                  </h2>
                  {currentWord.extraForms && currentWord.extraForms.length > 0 && (
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      {currentWord.extraForms.map((f, i) => (
                        <span key={i} className="px-4 py-1.5 bg-slate-800/50 rounded-xl text-base text-slate-300 italic border border-slate-600/30">{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="absolute bottom-10 flex gap-12">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center"><FaRotateLeft className="text-slate-400 text-xs"/></div>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Swipe Left</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full border border-emerald-500/50 flex items-center justify-center"><FaCheck className="text-emerald-400 text-xs"/></div>
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Swipe Right</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 h-12 flex items-center justify-center">
          {isCorrect === true && <div className="flex items-center gap-3 text-emerald-400 font-black tracking-widest text-sm animate-bounce"><FaCheck /> CORRECT!</div>}
          {isCorrect === false && <div className="flex items-center gap-3 text-rose-400 font-black tracking-widest text-sm animate-pulse"><FaXmark /> WRONG!</div>}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.4);
        }
      `}</style>
    </div>
  );
}

export default Practice;
