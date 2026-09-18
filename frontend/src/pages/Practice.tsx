import { getBackendUrl } from '../services/api'
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaXmark, FaVolumeHigh, FaRotateLeft } from 'react-icons/fa6';
import type { AllWord } from '../types';
import MatchingMode from '../components/MatchingMode';

type FilterType = 'due' | 'unlearned' | 'all' | 'learned' | 'custom';

function Practice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [practiceMode, setPracticeModeState] = useState<'cards' | 'writing' | 'matching'>(() => {
    const m = searchParams.get('mode');
    return m === 'cards' || m === 'writing' || m === 'matching' ? m : 'cards';
  });

  const setPracticeMode = (mode: 'writing' | 'cards' | 'matching') => {
    setPracticeModeState(mode);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('mode', mode);
      return next;
    }, { replace: true });
  };

  const [dictionaries, setDictionaries] = useState<{ dictionaryId: number; dictionaryName: string; language: string; amountWord: number }[]>([]);
  const [selectedDictId, setSelectedDictId] = useState<number | null>(id ? Number(id) : null);

  const [allFetchedWords, setAllFetchedWords] = useState<AllWord[]>([]);
  const [words, setWords] = useState<AllWord[]>([]);
  const [sessionTotalWords, setSessionTotalWords] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [direction, setDirection] = useState<'origToTrans' | 'transToOrig'>('origToTrans');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWritingHint, setShowWritingHint] = useState(false);
  const [showLetterHint, setShowLetterHint] = useState(false);

  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('due');

  const [activeLetters, setActiveLetters] = useState<string[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [presets, setPresets] = useState<{ name: string; activeLetters: string[]; selectedWordIds: number[] }[]>([]);
  const [presetNameInput, setPresetNameInput] = useState('');

  const [isFlipped, setIsFlipped] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  const getUserId = () => {
    const saved = localStorage.getItem('sessionUser');
    if (saved) return JSON.parse(saved).id;
    return null;
  };

  // If no ID is passed in params, fetch user's dictionaries
  useEffect(() => {
    if (!id) {
      const userId = getUserId();
      fetch(getBackendUrl("/dictionary/Getdictionary"), {
        headers: { "user-id": userId?.toString() || "" }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setDictionaries(data);
            setSelectedDictId(prev => prev ?? data[0].dictionaryId);
          } else {
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  const activeDictId = id ? Number(id) : selectedDictId;

  const fetchWords = useCallback(() => {
    if (!activeDictId) return;
    setLoading(true);
    const userId = getUserId();
    fetch(getBackendUrl(`/word/getWord/${activeDictId}`), {
      headers: { "user-id": userId?.toString() || "" }
    })
      .then(res => res.json())
      .then(data => {
        const flat: AllWord[] = Object.values(data).flat() as AllWord[];
        setAllFetchedWords(flat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeDictId]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const unlearnedWords = React.useMemo(() => allFetchedWords.filter(w => !w.remembered), [allFetchedWords]);
  const learnedWords = React.useMemo(() => allFetchedWords.filter(w => w.remembered), [allFetchedWords]);
  const dueWords = React.useMemo(() => {
    const now = new Date();
    return allFetchedWords.filter(w => {
      if (!w.remembered) return true; // Always practice new words
      if (w.nextReviewDate && new Date(w.nextReviewDate) <= now) return true;
      return false;
    });
  }, [allFetchedWords]);

  // Default to 'all' if dictionary has words but 0 due
  useEffect(() => {
    if (allFetchedWords.length > 0 && dueWords.length === 0 && filterType === 'due') {
      setFilterType('all');
    }
  }, [allFetchedWords, dueWords.length, filterType]);

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

  // Load saved custom selection for active dictionary
  useEffect(() => {
    if (!activeDictId) return;
    const savedSel = localStorage.getItem(`dict_practice_sel_${activeDictId}`);
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
  }, [activeDictId, allFetchedWords]);

  // Save custom selection for active dictionary
  useEffect(() => {
    if (!activeDictId || allFetchedWords.length === 0) return;
    const selState = { activeLetters, selectedWordIds };
    localStorage.setItem(`dict_practice_sel_${activeDictId}`, JSON.stringify(selState));
  }, [activeDictId, activeLetters, selectedWordIds, allFetchedWords]);

  // Load presets
  useEffect(() => {
    if (!activeDictId) return;
    const savedPresets = localStorage.getItem(`dict_practice_presets_${activeDictId}`);
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error("Error parsing presets", e);
      }
    }
  }, [activeDictId]);

  const savePreset = () => {
    if (!presetNameInput.trim()) {
      alert("Please enter a preset name!");
      return;
    }
    if (selectedWordIds.length === 0) {
      alert("Please select at least one word!");
      return;
    }

    const newPreset = {
      name: presetNameInput.trim(),
      activeLetters: [...activeLetters],
      selectedWordIds: [...selectedWordIds]
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    if (activeDictId) {
      localStorage.setItem(`dict_practice_presets_${activeDictId}`, JSON.stringify(updatedPresets));
    }
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
    if (activeDictId) {
      localStorage.setItem(`dict_practice_presets_${activeDictId}`, JSON.stringify(updatedPresets));
    }
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

  const targetWordsCount = React.useMemo(() => {
    if (filterType === 'due') return dueWords.length;
    if (filterType === 'unlearned') return unlearnedWords.length;
    if (filterType === 'all') return allFetchedWords.length;
    if (filterType === 'learned') return learnedWords.length;
    if (filterType === 'custom') return selectedWordIds.length;
    return 0;
  }, [filterType, dueWords.length, unlearnedWords.length, allFetchedWords.length, learnedWords.length, selectedWordIds.length]);

  const startPractice = () => {
    let filtered: AllWord[] = [];

    if (filterType === 'due') {
      filtered = dueWords;
    } else if (filterType === 'unlearned') {
      filtered = unlearnedWords;
    } else if (filterType === 'learned') {
      filtered = learnedWords;
    } else if (filterType === 'all') {
      filtered = allFetchedWords;
    } else if (filterType === 'custom') {
      if (selectedWordIds.length === 0) {
        alert("Please select at least one word to practice!");
        return;
      }
      filtered = allFetchedWords.filter(w => selectedWordIds.includes(w.id));
    }

    if (filtered.length === 0) {
      alert("No words found for this selection! Please select another option.");
      return;
    }

    setWords([...filtered].sort(() => Math.random() - 0.5));
    setSessionTotalWords(filtered.length);
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
      })
      .catch(err => console.error("Error recording practice:", err));
    }
  };

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
    let nextInterval = 3;
    if (word.remembered && word.interval) {
      if (word.interval === 3) nextInterval = 7;
      else if (word.interval === 7) nextInterval = 30;
      else nextInterval = 30;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);

    try {
      await fetch(getBackendUrl(`/word/update/${word.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId?.toString() || ""
        },
        body: JSON.stringify({ remembered: true, interval: nextInterval, nextReviewDate: nextDate.toISOString() })
      });
    } catch (error) {
      console.error('Error updating word:', error);
    }
  };

  const markAsForgotten = async (word: AllWord) => {
    const userId = getUserId();
    try {
      await fetch(getBackendUrl(`/word/update/${word.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId?.toString() || ""
        },
        body: JSON.stringify({ remembered: false, interval: 0, nextReviewDate: null })
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
      markAsForgotten(currentWord).then(() => {
        setTimeout(() => {
          setIsCorrect(null);
          nextWord(true);
        }, 1000);
      });
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
    setShowWritingHint(false);
    setShowLetterHint(false);
  };

  const handleCardResult = (known: boolean) => {
    if (!currentWord || isCorrect !== null) return;
    if (known) {
      setIsCorrect(true);
      markAsLearned(currentWord).then(() => {
        setTimeout(() => nextWord(true), 800);
      });
    } else {
      setIsCorrect(false);
      markAsForgotten(currentWord).then(() => {
        setTimeout(() => {
          nextWord(true);
        }, 800);
      });
    }
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
      handleCardResult(true);
    } else if (dragOffset < -100) {
      handleCardResult(false);
    } else {
      setDragOffset(0);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-bold animate-pulse text-xs tracking-widest uppercase">
        Loading words...
      </div>
    );
  }

  // Setup / Configuration modal
  if (isSetupOpen) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl sm:max-w-2xl bg-slate-800/95 border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-700/50 pb-3">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Session Setup
              </h1>
              <p className="text-[11px] text-slate-400 font-normal">
                Choose repetition mode, words, and direction
              </p>
            </div>

            {/* Dictionary picker if no ID was provided in route */}
            {!id && dictionaries.length > 0 && (
              <div className="w-full sm:w-auto">
                <select
                  value={selectedDictId || ''}
                  onChange={(e) => setSelectedDictId(Number(e.target.value))}
                  className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-blue-500"
                >
                  {dictionaries.map(d => (
                    <option key={d.dictionaryId} value={d.dictionaryId}>
                      {d.dictionaryName} ({d.amountWord} words)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ROW 1: Mode (Cards / Writing) - MATCHING APP BUTTON COLORS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                1. Mode
              </span>
              <span className="text-[11px] font-medium text-blue-400">
                {practiceMode === 'cards' ? 'Flashcards' : practiceMode === 'writing' ? 'Writing' : 'Matching'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPracticeMode('cards')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs sm:text-sm font-semibold ${
                  practiceMode === 'cards'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Flashcards
              </button>

              <button
                type="button"
                onClick={() => setPracticeMode('writing')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs sm:text-sm font-semibold ${
                  practiceMode === 'writing'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Writing
              </button>
              
              <button
                type="button"
                onClick={() => setPracticeMode('matching')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs sm:text-sm font-semibold ${
                  practiceMode === 'matching'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Matching
              </button>
            </div>
          </div>

          {/* Divider 1 */}
          <div className="border-t border-slate-700/40"></div>

          {/* ROW 2: Words to Practice - MATCHING APP BUTTON COLORS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                2. Words
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {targetWordsCount} {targetWordsCount === 1 ? 'word' : 'words'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilterType('due')}
                className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs font-semibold ${
                  filterType === 'due'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Due ({dueWords.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('unlearned')}
                className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs font-semibold ${
                  filterType === 'unlearned'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                New ({unlearnedWords.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs font-semibold ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                All ({allFetchedWords.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('learned')}
                className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs font-semibold ${
                  filterType === 'learned'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Learned ({learnedWords.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('custom')}
                className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs font-semibold ${
                  filterType === 'custom'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Custom ({selectedWordIds.length})
              </button>
            </div>
          </div>

          {/* Divider 2 */}
          <div className="border-t border-slate-700/40"></div>

          {/* ROW 3: Translation Direction - MATCHING APP BUTTON COLORS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                3. Direction
              </span>
              <span className="text-[11px] font-medium text-blue-400">
                {direction === 'origToTrans' ? 'Original → Translation' : 'Translation → Original'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('origToTrans')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs sm:text-sm font-semibold ${
                  direction === 'origToTrans'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Original → Translation
              </button>

              <button
                type="button"
                onClick={() => setDirection('transToOrig')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer select-none text-xs sm:text-sm font-semibold ${
                  direction === 'transToOrig'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
              >
                Translation → Original
              </button>
            </div>
          </div>

          {/* Expandable Custom Selection panel if filterType === 'custom' */}
          {filterType === 'custom' && (
            <div className="pt-2 border-t border-slate-700/40 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Letters & Words
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllCustom}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded-md border border-slate-700 transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearCustom}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded-md border border-slate-700 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={presetNameInput}
                  onChange={e => setPresetNameInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={savePreset}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>

              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => loadPreset(preset)}
                        className="text-slate-300 hover:text-blue-400 transition-colors font-medium cursor-pointer"
                      >
                        {preset.name} ({preset.selectedWordIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePreset(idx)}
                        className="text-slate-500 hover:text-rose-400 text-xs font-bold px-1 cursor-pointer"
                        title="Delete preset"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Letters */}
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-0.5">
                {Object.keys(wordsByLetter).map(letter => {
                  const letterWords = wordsByLetter[letter] || [];
                  const wordIds = letterWords.map(w => w.id);
                  const selectedCount = wordIds.filter(wid => selectedWordIds.includes(wid)).length;
                  const totalCount = letterWords.length;
                  const isFullySelected = selectedCount === totalCount;
                  const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

                  let btnClass = "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700";
                  if (isFullySelected) {
                    btnClass = "bg-blue-600 border-blue-500 text-white font-semibold";
                  } else if (isPartiallySelected) {
                    btnClass = "bg-blue-600/30 border-blue-500/70 text-blue-200 font-semibold";
                  }

                  return (
                    <button
                      type="button"
                      key={letter}
                      onClick={() => toggleLetter(letter)}
                      className={`px-2.5 py-1 rounded-md border text-xs transition-colors flex items-center gap-1 cursor-pointer select-none ${btnClass}`}
                    >
                      <span className="font-bold">{letter}</span>
                      <span className="text-[10px] opacity-75">({selectedCount}/{totalCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* Words list */}
              {activeLetters.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-slate-700/50 bg-slate-900/40 rounded-lg p-2 space-y-2 custom-scrollbar">
                  {activeLetters.sort().map(letter => {
                    const letterWords = wordsByLetter[letter] || [];
                    return (
                      <div key={letter} className="space-y-1">
                        <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider border-b border-slate-700/50 pb-0.5 flex justify-between">
                          <span>Letter {letter}</span>
                          <span className="text-slate-400 font-normal">
                            {letterWords.filter(w => selectedWordIds.includes(w.id)).length} of {letterWords.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {letterWords.map(word => {
                            const isWordSelected = selectedWordIds.includes(word.id);
                            return (
                              <label
                                key={word.id}
                                className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer select-none text-xs ${
                                  isWordSelected
                                    ? 'bg-slate-800 border-blue-500/60 text-white'
                                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isWordSelected}
                                  onChange={() => {
                                    setSelectedWordIds(prev =>
                                      prev.includes(word.id)
                                        ? prev.filter(wid => wid !== word.id)
                                        : [...prev, word.id]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-950 border-slate-700 focus:ring-blue-500"
                                />
                                <span className="font-medium truncate flex-1">{word.text}</span>
                                <span className="text-slate-400 truncate text-[11px]">{word.translate}</span>
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
          )}

          {/* Action buttons - EXACT MATCH TO MODAL / APP BUTTONS */}
          <div className="pt-2 flex gap-2.5 border-t border-slate-700/50">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={startPractice}
              disabled={targetWordsCount === 0}
              className={`flex-[2] py-2.5 font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors shadow-sm ${
                targetWordsCount > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }`}
            >
              Start Session ({targetWordsCount})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done screen
  if (words.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-slate-900 items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-5 border border-emerald-500/20">
          <FaCheck size={28} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-1.5 text-white tracking-tight">DONE!</h2>
        <p className="text-slate-400 mb-6 text-xs uppercase tracking-wider">All selected words have been practiced.</p>
        <div className="flex gap-3">
          <button onClick={() => setIsSetupOpen(true)} className="px-6 py-2.5 bg-slate-800 rounded-lg font-semibold uppercase text-xs tracking-wider hover:bg-slate-700 transition-colors flex items-center gap-2 cursor-pointer text-slate-300">
            <FaRotateLeft size={14} /> Restart
          </button>
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-blue-600 rounded-lg font-semibold uppercase text-xs tracking-wider hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-sm cursor-pointer text-white">
            <FaArrowLeft size={14} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  // Active practice session
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4 sm:p-6 relative overflow-hidden">
      {/* Top navigation & mode switcher */}
      <div className="flex items-center justify-between mb-6 max-w-xl mx-auto w-full relative z-[70]">
        <button
          onClick={() => setIsSetupOpen(true)}
          className="p-2.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Back to setup"
        >
          <FaArrowLeft size={16} />
        </button>

        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setPracticeMode('cards')}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              practiceMode === 'cards' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setPracticeMode('writing')}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              practiceMode === 'writing' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Writing
          </button>
          <button
            onClick={() => setPracticeMode('matching')}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              practiceMode === 'matching' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Matching
          </button>
        </div>

        <div className="w-9"></div>
      </div>

      {practiceMode !== 'matching' && (
        <div className="flex flex-col items-center w-full max-w-sm mx-auto mb-4 sm:mb-8 z-10">
          <div className="flex justify-between w-full mb-1.5 px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Session Progress</span>
            <span className="text-[10px] font-bold text-slate-400">{sessionTotalWords - words.length} / {sessionTotalWords}</span>
          </div>
          <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${Math.round(((sessionTotalWords - words.length) / (sessionTotalWords || 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col items-center justify-start pt-2 sm:pt-4 mx-auto w-full relative ${practiceMode === 'matching' ? 'max-w-5xl' : 'max-w-lg'}`}>
        {practiceMode === 'matching' ? (
          <MatchingMode 
            words={words} 
            onCorrect={(id) => {
              const word = words.find(w => w.id === id);
              if (word) markAsLearned(word);
            }} 
            onWrong={(id) => {
              const word = words.find(w => w.id === id);
              if (word) markAsForgotten(word);
            }} 
            onFinish={() => {
              setIsSetupOpen(true);
            }} 
          />
        ) : practiceMode === 'writing' ? (
          <div className={`w-full bg-slate-800/60 border p-6 sm:p-10 rounded-2xl shadow-xl backdrop-blur-sm text-center relative overflow-hidden transition-all duration-300 ${isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-500' : 'border-slate-700'}`}>
            <div className={`absolute inset-0 transition-opacity duration-500 ${isCorrect === true ? 'bg-emerald-500/10 opacity-100' : isCorrect === false ? 'bg-rose-500/10 opacity-100' : 'opacity-0'}`}></div>

            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {direction === 'origToTrans' ? 'Translate:' : 'Type original:'}
              </span>
              <button
                onClick={() => speak(currentWord.text)}
                className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                title="Pronounce"
              >
                <FaVolumeHigh size={18} />
              </button>
            </div>

            <div className="cursor-pointer group relative mb-6" onClick={() => setShowWritingHint(!showWritingHint)}>
              <h1 className="text-3xl sm:text-4xl font-bold text-white break-words transition-colors group-hover:text-blue-400 leading-tight">
                {direction === 'origToTrans' ? currentWord.text : currentWord.translate}
              </h1>
              <div className={`mt-3 transition-all duration-300 ${showWritingHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                <span className="text-sm font-medium text-blue-400 italic">
                  {direction === 'origToTrans' ? currentWord.translate : currentWord.text}
                </span>
              </div>
              {!showWritingHint && <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1.5">Tap for full answer</p>}
            </div>

            <form onSubmit={handleCheck} className="relative">
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type answer..."
                className={`w-full bg-slate-900/60 border py-3 px-5 rounded-xl text-lg font-medium text-center text-white outline-none transition-all duration-300 placeholder:text-slate-600
                  ${isCorrect === true ? 'border-emerald-500' :
                    isCorrect === false ? 'border-rose-500 animate-shake' :
                    'border-slate-700 focus:border-blue-500 shadow-inner'}`}
              />

              {/* First-letter hint */}
              <div className="flex items-center justify-center mt-3 min-h-[22px]">
                {showLetterHint ? (
                  <span className="text-xs text-amber-400 font-semibold tracking-widest">
                    Starts with: <span className="text-amber-300 text-base font-bold uppercase">
                      {(direction === 'origToTrans' ? currentWord.translate : currentWord.text)?.[0] ?? '?'}
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLetterHint(true)}
                    className="text-[10px] text-slate-500 hover:text-amber-400 uppercase tracking-wider transition-colors font-medium flex items-center gap-1"
                  >
                    💡 Show first letter
                  </button>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => nextWord(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-xs rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold uppercase tracking-wider text-xs rounded-xl hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
                >
                  Check
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-full relative">
            {/* Stack Effect */}
            {words.length > 1 && (
              <div className="absolute w-full h-[420px] top-2 left-0 scale-[0.98] rotate-[2deg] opacity-70 bg-slate-800 border border-slate-700/50 rounded-2xl -z-10 pointer-events-none shadow-md"></div>
            )}
            {words.length > 2 && (
              <div className="absolute w-full h-[420px] top-4 left-0 scale-[0.95] -rotate-[3deg] opacity-50 bg-slate-800 border border-slate-700/30 rounded-2xl -z-20 pointer-events-none shadow-sm"></div>
            )}
            {words.length > 3 && (
              <div className="absolute w-full h-[420px] top-6 left-0 scale-[0.92] rotate-[4deg] opacity-30 bg-slate-800 border border-slate-700/30 rounded-2xl -z-30 pointer-events-none"></div>
            )}
            
            <div
              className="w-full h-[420px] perspective-1000 cursor-grab active:cursor-grabbing relative z-10"
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
                <div className={`absolute -right-20 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-opacity pointer-events-none ${dragOffset > 50 ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="p-3.5 bg-emerald-500 text-white rounded-full shadow-md"><FaCheck size={24}/></div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Know</span>
                </div>
                <div className={`absolute -left-20 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-opacity pointer-events-none ${dragOffset < -50 ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="p-3.5 bg-rose-500 text-white rounded-full shadow-md"><FaXmark size={24}/></div>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Learn</span>
                </div>

                <div
                  onClick={() => !isDragging && setIsFlipped(!isFlipped)}
                  className={`w-full h-full relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}
                >
                  {/* Front card */}
                  <div className={`absolute inset-0 backface-hidden bg-slate-800 border rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl transition-all duration-300 select-none ${isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-500' : 'border-slate-700'}`}>
                    <span className="absolute top-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      {direction === 'origToTrans' ? 'Question' : 'Translation'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); speak(currentWord.text); }}
                      className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Pronounce"
                    >
                      <FaVolumeHigh size={20}/>
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight">
                      {direction === 'origToTrans' ? currentWord.text : currentWord.translate}
                    </h2>
                    <p className="absolute bottom-8 text-[10px] text-slate-500 uppercase tracking-wider animate-pulse">Tap to reveal</p>
                  </div>

                  {/* Back card */}
                  <div className={`absolute inset-0 backface-hidden bg-slate-800 border rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl rotate-y-180 transition-all duration-300 select-none ${isCorrect === true ? 'border-emerald-500' : isCorrect === false ? 'border-rose-500' : 'border-blue-500/60'}`}>
                    <span className="absolute top-6 text-[10px] font-semibold text-blue-400 uppercase tracking-widest">
                      {direction === 'origToTrans' ? 'Translation' : 'Question'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); speak(currentWord.text); }}
                      className="absolute top-6 right-6 p-2 text-blue-400 hover:text-white transition-colors cursor-pointer"
                      title="Pronounce"
                    >
                      <FaVolumeHigh size={20}/>
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight">
                      {direction === 'origToTrans' ? currentWord.translate : currentWord.text}
                    </h2>
                    {currentWord.extraForms && currentWord.extraForms.length > 0 && (
                      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                        {currentWord.extraForms.map((f, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-900/60 rounded-md text-xs text-slate-300 italic border border-slate-700/60">{f}</span>
                        ))}
                      </div>
                    )}
                    <p className="absolute bottom-8 text-[10px] text-slate-400 uppercase tracking-wider">Tap to flip back</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {practiceMode !== 'matching' && (
          <div className="mt-4 h-8 flex items-center justify-center">
            {isCorrect === true && <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider text-xs animate-bounce"><FaCheck size={12}/> CORRECT!</div>}
            {isCorrect === false && <div className="flex items-center gap-2 text-rose-400 font-bold tracking-wider text-xs animate-pulse"><FaXmark size={12}/> REPEAT LATER!</div>}
          </div>
        )}
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
          width: 5px;
          height: 5px;
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
