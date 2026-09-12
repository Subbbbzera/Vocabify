import { getBackendUrl } from '../services/api'
import { useEffect, useRef, useState, useMemo, useCallback, useDeferredValue } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Modal from "../components/Modal"
import Word from "../components/forDictionaries/Word"
import Input from "../components/Input"
import { FaPlus, FaBars, FaShuffle, FaLayerGroup, FaChevronDown, FaGraduationCap, FaArrowUp } from "react-icons/fa6"
import { FaSearch } from "react-icons/fa"
import type { AllWord, WordToShow } from "../types"

type FlatItem =
  | { type: 'header', letter: string, isCollapsed: boolean }
  | { type: 'word', data: AllWord };

function InnerD() {
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingWord, setEditingWord] = useState<AllWord | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isListSettingsOpen, setIsListSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const getUserId = () => {
    const saved = localStorage.getItem('sessionUser');
    if (saved) return JSON.parse(saved).id;
    return null;
  }

  const resetAllWords = async () => {
    if (!id || !Allwords.length) return;
    if (!window.confirm("Are you sure you want to reset all words to 'Unlearned'?")) return;
    const userId = getUserId();

    try {
      const allWordsFlat = Allwords.flatMap(([_, words]) => words);
      await Promise.all(allWordsFlat.map(word =>
        fetch(getBackendUrl(`/word/update/${word.id}`), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "user-id": userId?.toString() || ""
          },
          body: JSON.stringify({
            text: word.text,
            translate: word.translate,
            extraForms: word.extraForms || [],
            dictionaryId: word.dictionaryId,
            remembered: false
          })
        })
      ));

      fetchWords();
      setIsMenuOpen(false);
      alert("All words have been reset!");
    } catch (error) {
      console.error('Error resetting words:', error);
      alert("Failed to reset words.");
    }
  };

  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const headerRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const [showScroll, setShowScroll] = useState(false);
  const lastScrollY = useRef(0);

  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('innerD-fontSize')) || 18);

  const [wordMargin, setWordMargin] = useState(() => Number(localStorage.getItem('innerD-wordMargin')) || 12);
  const [wordPaddingY, setWordPaddingY] = useState(() => Number(localStorage.getItem('innerD-wordPaddingY')) || 16);
  const [showStatus, setShowStatus] = useState(() => localStorage.getItem('innerD-showStatus') !== 'false');
  const [showAlphabet, setShowAlphabet] = useState(() => localStorage.getItem('innerD-showAlphabet') !== 'false');

  useEffect(() => {
    localStorage.setItem('innerD-showAlphabet', showAlphabet.toString());
  }, [showAlphabet]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 400 && currentScrollY < lastScrollY.current) {
        setShowScroll(true);
      } else {
        setShowScroll(false);
      }
      lastScrollY.current = currentScrollY;

      const letters = Object.keys(headerRefs.current).sort();
      let current: string | null = null;

      for (const letter of letters) {
        const el = headerRefs.current[letter];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            current = letter;
          }
        }
      }
      setActiveLetter(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('innerD-fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('innerD-wordMargin', wordMargin.toString());
  }, [wordMargin]);

  useEffect(() => {
    localStorage.setItem('innerD-wordPaddingY', wordPaddingY.toString());
  }, [wordPaddingY]);

  useEffect(() => {
    localStorage.setItem('innerD-showStatus', showStatus.toString());
  }, [showStatus]);

  const [value, setValue] = useState("")

  const deferredSearch = useDeferredValue(value)

  const [Allwords, setAllWords] = useState<WordToShow>([])
  const [isFlattened, setIsFlattened] = useState(false)
  const [hideMode, setHideMode] = useState<'none' | 'text' | 'translate'>('none')
  const [collapsedStacks, setCollapsedStacks] = useState<string[]>([])
  const [shuffledStacks, setShuffledStacks] = useState<WordToShow | null>(null)

  const [visibleCount, setVisibleCount] = useState(40)
  const loaderRef = useRef<HTMLDivElement>(null)

  const {id} = useParams()

  const fetchWords = useCallback(() => {
    if (!id || id === "undefined") return;
    const userId = getUserId();
    fetch(getBackendUrl(`/word/getWord/${id}`), {
      headers: { "user-id": userId?.toString() || "" }
    })
    .then(res => res.json())
    .then(data => {

      const merged: {[key: string]: AllWord[]} = {};
      const lookalikes: {[key: string]: string} = {
        'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'І': 'I', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y'
      };

      Object.entries(data).forEach(([letter, words]) => {
        const upLetter = letter.toUpperCase().trim();
        const normalized = lookalikes[upLetter] || upLetter;
        if (!merged[normalized]) merged[normalized] = [];
        merged[normalized].push(...(words as AllWord[]));
      });

      const entries = Object.entries(merged).sort((a,b) => a[0].localeCompare(b[0])) as WordToShow;
      setAllWords(entries)
      setShuffledStacks(null)
      setValue("")
      setVisibleCount(40)
      headerRefs.current = {};
    })
  }, [id])

  useEffect(() => {
    fetchWords()
  }, [fetchWords])

  useEffect(() => {
    setVisibleCount(40);
  }, [deferredSearch]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 30)
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [Allwords, deferredSearch, collapsedStacks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const filteredWords = useMemo(() => {
    const source = shuffledStacks || Allwords;
    const searchTerm = deferredSearch.trim().toLowerCase();

    if (searchTerm === '') return source;

    return source.map(([letter, words]) => {
      const matchingWords = words.filter(word =>
        word.text.toLowerCase().includes(searchTerm) ||
        word.translate.toLowerCase().includes(searchTerm) ||
        word.extraForms?.some(f => f.toLowerCase().includes(searchTerm))
      );
      return [letter, matchingWords] as [string, AllWord[]];
    }).filter(([_, words]) => words.length > 0);
  }, [deferredSearch, Allwords, shuffledStacks]);

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    filteredWords.forEach(([letter, words]) => {
      const isCollapsed = collapsedStacks.includes(letter);
      if (!isFlattened) items.push({ type: 'header', letter, isCollapsed });
      if (!isCollapsed || isFlattened) {
        words.forEach(word => items.push({ type: 'word', data: word }));
      }
    });
    return items;
  }, [filteredWords, collapsedStacks, isFlattened]);

  const toggleStack = useCallback((letter: string) => {
    setCollapsedStacks(prev =>
      prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]
    );
  }, []);

  const handleEditClick = useCallback((word: AllWord) => {
    setEditingWord(word);
    setEditModal(true);
  }, []);

  const CreateWord = (object : {field1: string, field2: string, extraFields?: string[], remembered?: boolean}) : boolean | string =>{
    const numId = Number(id)
    const userId = getUserId();
    const wordToSave = {
      text: object.field1.trim(), translate: object.field2.trim(),
      extraForms: object.extraFields?.filter(f => f.trim() !== ""),
      dictionaryId: numId,
      remembered: object.remembered || false
    }

    if (wordToSave.text.toLowerCase() === wordToSave.translate.toLowerCase()) {
      return "Оригінал і переклад не можуть бути однаковими!";
    }

    const exists = Allwords.some(([_, words]) =>
      words.some(w =>
        w.text.trim().toLowerCase() === wordToSave.text.toLowerCase() &&
        w.translate.trim().toLowerCase() === wordToSave.translate.toLowerCase()
      )
    );
    if (exists) {
      return "У вас таке слово вже є!";
    }

    if(wordToSave.text !== '' && wordToSave.translate !== ''){
      fetch(getBackendUrl("/word/save"), {
        method: "POST",
        headers: {
          "Content-type" : "Application/json",
          "user-id": userId?.toString() || ""
        },
        body: JSON.stringify(wordToSave)
      })
      .then(res => res.ok ? res.text().then(t => t ? JSON.parse(t) : {}) : Promise.reject("Failed to save"))
      .then(() => fetchWords())
    }
    return true
  }

  const ConfirmEdit = (object: {field1: string, field2: string, extraFields?: string[], remembered?: boolean}) : boolean | string => {
    if (!editingWord) return false;
    const wordToSave = {
      text: object.field1.trim(),
      translate: object.field2.trim(),
    }

    if (wordToSave.text.toLowerCase() === wordToSave.translate.toLowerCase()) {
      return "Оригінал і переклад не можуть бути однаковими!";
    }

    const exists = Allwords.some(([_, words]) =>
      words.some(w =>
        w.id !== editingWord.id &&
        w.text.trim().toLowerCase() === wordToSave.text.toLowerCase() &&
        w.translate.trim().toLowerCase() === wordToSave.translate.toLowerCase()
      )
    );
    if (exists) {
      return "У вас таке слово вже є!";
    }

    const userId = getUserId();
    fetch(getBackendUrl(`/word/update/${editingWord.id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-id": userId?.toString() || ""
      },
      body: JSON.stringify({
        text: object.field1, translate: object.field2,
        extraForms: object.extraFields?.filter(f => f.trim() !== "") || [],
        dictionaryId: editingWord.dictionaryId,
        remembered: object.remembered ?? editingWord.remembered
      })
    })
    .then(res => res.ok ? res.text().then(t => t ? JSON.parse(t) : {}) : Promise.reject("Failed to update"))
    .then(() => { fetchWords(); setEditModal(false); setEditingWord(null); })
    return true;
  }

  const handleDelete = useCallback((wordId: number) => {
    const userId = getUserId();
    fetch(getBackendUrl(`/word/delete/${wordId}`), {
      method: "DELETE",
      headers: { "user-id": userId?.toString() || "" }
    })
    .then(() => fetchWords())
  }, [fetchWords])

  const shuffleStacks = () => {
    if (shuffledStacks && !isFlattened) {
      setShuffledStacks(null);
    } else {
      const shuffled = [...Allwords].sort(() => Math.random() - 0.5);
      setShuffledStacks(shuffled);
      setIsFlattened(false);
    }
    setIsMenuOpen(false);
    setVisibleCount(40);
  }

  const shuffleAllWords = () => {
    if (shuffledStacks && isFlattened) {
      setShuffledStacks(null);
      setIsFlattened(false);
    } else {
      const allWordsFlat: AllWord[] = Allwords.flatMap(entry => entry[1]);
      const shuffledFlat = allWordsFlat.sort(() => Math.random() - 0.5);
      setShuffledStacks([['All Words', shuffledFlat]]);
      setIsFlattened(true);
    }
    setIsMenuOpen(false);
    setVisibleCount(40);
  }

  const scrollToLetter = (letter: string) => {

    const headerIndex = flatItems.findIndex(item => item.type === 'header' && item.letter === letter);

    if (headerIndex !== -1) {

      if (headerIndex >= visibleCount) {
        setVisibleCount(headerIndex + 20);
      }

      setTimeout(() => {
        const el = headerRefs.current[letter];
        if (el) {
          const offset = 100;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 50);
    }
  };

  const availableLetters = useMemo(() => {
    if (isFlattened) return [];
    return filteredWords.map(([letter]) => letter).sort();
  }, [filteredWords, isFlattened]);

  return (
    <div className='flex flex-col mt-4 mb-20 relative'>

    {showAlphabet && !isFlattened && availableLetters.length > 1 && (
      <div
        className="fixed right-1 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-0.5 py-3 px-0.5 bg-slate-800/20 backdrop-blur-md rounded-full border border-slate-700/30 max-h-[80vh] overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.fixed::-webkit-scrollbar { display: none; }`}</style>
        {availableLetters.map(letter => (
          <button
            key={letter}
            onClick={() => scrollToLetter(letter)}
            className={`text-[8px] font-black uppercase transition-all duration-200 min-w-[20px] min-h-[20px] flex items-center justify-center rounded-full flex-shrink-0
              ${activeLetter === letter
                ? 'bg-sky-500 text-white scale-125 shadow-lg shadow-sky-500/40 z-10'
                : 'text-slate-500 hover:text-slate-300 hover:scale-110'}`}
          >
            {letter}
          </button>
        ))}
      </div>
    )}

    <div className="flex items-center justify-center gap-4 mx-auto mb-24 md:mb-14 relative w-full px-4 max-w-4xl">
      <div className="relative" ref={menuRef}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-3 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-700 text-white' : 'bg-slate-800/40 text-slate-400 hover:text-white'}`}>
          <FaBars className="text-xl"/>
        </button>
        {isMenuOpen && (
          <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
            <button onClick={shuffleStacks} className='w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700 text-slate-200 transition-colors border-b border-slate-700'>
              <div className="flex items-center gap-3">
                <FaLayerGroup className="text-sky-400"/>
                <span className="text-sm font-medium">Shuffle Stacks</span>
              </div>
              {shuffledStacks && !isFlattened && <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"></div>}
            </button>
            <button onClick={shuffleAllWords} className='w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700 text-slate-200 transition-colors border-b border-slate-700'>
              <div className="flex items-center gap-3">
                <FaShuffle className="text-emerald-400"/>
                <span className="text-sm font-medium">Shuffle All Words</span>
              </div>
              {shuffledStacks && isFlattened && <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>}
            </button>

            <button
              onClick={() => setIsListSettingsOpen(!isListSettingsOpen)}
              className="w-full px-4 py-2 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 border-b border-slate-700/50 hover:bg-slate-900/50 transition-colors"
            >
              <span>List Settings</span>
              <FaChevronDown className={`transition-transform duration-300 ${isListSettingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isListSettingsOpen && (
              <div className="bg-slate-900/20">
                <div className="px-4 py-2 border-b border-slate-700">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Font Size</span>
                    <span className="text-xs text-sky-400 font-black">{fontSize}px</span>
                  </div>
                  <input type="range" min="12" max="32" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                </div>

                <div className="px-4 py-2 border-b border-slate-700">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Vertical Gap</span>
                    <span className="text-xs text-sky-400 font-black">{wordMargin}px</span>
                  </div>
                  <input type="range" min="0" max="40" value={wordMargin} onChange={(e) => setWordMargin(Number(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                </div>

                <div className="px-4 py-2 border-b border-slate-700">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Vertical Padding</span>
                    <span className="text-xs text-sky-400 font-black">{wordPaddingY}px</span>
                  </div>
                  <input type="range" min="4" max="40" value={wordPaddingY} onChange={(e) => setWordPaddingY(Number(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                </div>
              </div>
            )}

            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 border-b border-slate-700/50">Indicators</div>

            <button onClick={() => setShowStatus(!showStatus)} className='w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700 text-slate-200 transition-colors border-b border-slate-700'>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${showStatus ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`}></div>
                <span className="text-sm font-medium">Show Status Indicators</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${showStatus ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${showStatus ? 'right-1 bg-emerald-500' : 'left-1 bg-slate-500'}`}></div>
              </div>
            </button>

            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 border-b border-slate-700/50">Alphabet</div>

            <button onClick={() => setShowAlphabet(!showAlphabet)} className='w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700 text-slate-200 transition-colors border-b border-slate-700'>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${showAlphabet ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]' : 'bg-slate-600'}`}></div>
                <span className="text-sm font-medium">Show Alphabet Index</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${showAlphabet ? 'bg-sky-500/20' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${showAlphabet ? 'right-1 bg-sky-500' : 'left-1 bg-slate-500'}`}></div>
              </div>
            </button>

            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 border-b border-slate-700/50">Activities</div>

            <button
              onClick={() => { setIsMenuOpen(false); navigate(`/practice/${id}`); }}
              className='w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-600/20 text-blue-400 transition-all border-b border-slate-700'
            >
              <FaGraduationCap className="text-blue-400 text-lg" />
              <span className="text-sm font-medium">Practice</span>
            </button>

            <button
              onClick={resetAllWords}
              className='w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-600/20 text-orange-400 transition-all border-b border-slate-700'
            >
              <span className="text-xs font-bold uppercase tracking-tight">Reset All Progress</span>
            </button>

            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 border-b border-slate-700/50">Visibility Mode</div>
            <div className="px-4 py-4">
              <div className="flex justify-between mb-3 text-[10px] font-black uppercase tracking-tighter">
                <span className={`transition-colors duration-300 ${hideMode === 'text' ? 'text-indigo-400' : 'text-slate-500'}`}>Hide Orig</span>
                <span className={`transition-colors duration-300 ${hideMode === 'none' ? 'text-sky-400' : 'text-slate-500'}`}>Show All</span>
                <span className={`transition-colors duration-300 ${hideMode === 'translate' ? 'text-rose-400' : 'text-slate-500'}`}>Hide Trans</span>
              </div>
              <div className="relative h-1.5 w-full bg-slate-900 rounded-lg">

                <div className="absolute inset-0 flex justify-between items-center px-[2px]">
                  {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-700"></div>)}
                </div>
                <input
                  type="range" min="0" max="2" step="1"
                  value={hideMode === 'text' ? 0 : hideMode === 'none' ? 1 : 2}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHideMode(val === 0 ? 'text' : val === 1 ? 'none' : 'translate');
                  }}
                  className="absolute inset-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-sky-500 z-10"
                />
              </div>
            </div>

            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30 border-b border-slate-700/50">Actions</div>
            <button
              onClick={() => { setModal(true); setIsMenuOpen(false); }}
              className='w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-600/20 text-emerald-400 transition-all'
            >
              <FaPlus className="text-lg" />
              <span className="text-sm font-bold uppercase tracking-tight">Add New Word</span>
            </button>
          </div>
        )}
      </div>

      <div className="relative flex-1 max-w-lg">
        <Input placeholder='search the word' paddingX='px-3' paddingY='py-2' width='w-full' value={value} setValue={setValue} onchange={(v) => setValue(v)}/>
        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
      </div>

      <button
        onClick={() => navigate(`/practice/${id}`)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-blue-900/25 text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex-shrink-0"
        title="Start Practice"
      >
        <FaGraduationCap className="text-base sm:text-lg" />
        <span className="hidden sm:inline">Practice</span>
      </button>
    </div>

    <div className="flex flex-col w-full max-w-3xl mx-auto pb-10">
      {flatItems.slice(0, visibleCount).map((item, idx) => {
        if (item.type === 'header') {
          return (
            <div
              ref={el => { headerRefs.current[item.letter] = el; }}
              key={`header-${item.letter}-${idx}`}
              className={`flex items-center gap-4 px-4 cursor-pointer group select-none transition-all duration-300 ${item.isCollapsed ? 'mb-2' : 'mb-6'} mt-8 first:mt-0`}
              onClick={() => toggleStack(item.letter)}
            >
              <h2 className={`text-4xl font-black transition-all duration-500 uppercase tracking-tighter ${item.isCollapsed ? 'text-slate-500/30' : 'text-slate-700'}`}>{item.letter}</h2>
              <div className={`h-[1px] flex-1 transition-all duration-500 ${item.isCollapsed ? 'bg-slate-700/10' : 'bg-slate-700/50'}`}></div>
              <FaChevronDown className={`text-slate-500 transition-transform duration-500 ${item.isCollapsed ? '-rotate-90 opacity-20 scale-75' : 'rotate-0'}`} />
            </div>
          )
        }
        return (
          <div key={`word-${item.data.id}-${idx}`} className="overflow-hidden opacity-100 transition-all duration-300">
            <Word id={item.data.id} text={item.data.text} translate={item.data.translate} extraForms={item.data.extraForms} hideMode={hideMode} onEdit={() => handleEditClick(item.data)} onDelete={() => handleDelete(item.data.id)} fontSize={fontSize} wordMargin={wordMargin} wordPaddingY={wordPaddingY} remembered={item.data.remembered} showStatus={showStatus}/>
          </div>
        )
      })}
      <div ref={loaderRef} className="h-10 w-full flex items-center justify-center mt-4">
        {visibleCount < flatItems.length && <div className="animate-pulse text-slate-600 font-bold text-xs uppercase tracking-widest">Loading more words...</div>}
      </div>
      {flatItems.length === 0 && <p className="mx-auto text-2xl font-semibold opacity-30 mt-10">Nothing found</p>}
    </div>

     {showScroll && (
       <button
         onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
         className="right-6 fixed bottom-20 p-5 rounded-full bg-sky-800 text-white shadow-lg animate-bounce transition-all hover:bg-sky-500"
       >
         <FaArrowUp className="text-xl" />
       </button>
     )}
      {modal ? <Modal name="Create New word" input1='Original' input2='Translation' input2Type="input" placeholder1="e.g. banana" buttonText="Add" onClose={() => setModal(false)} onCreate={CreateWord} showAddMore={true}/> : null}
      {editModal && editingWord ? (
        <Modal name="Edit word" input1='Original' input2='Translation' input2Type="input" placeholder1={editingWord.text} buttonText="Save" onClose={() => { setEditModal(false); setEditingWord(null); }} onCreate={ConfirmEdit} onDelete={() => handleDelete(editingWord.id)} defaultValue1={editingWord.text} defaultValue2={editingWord.translate} defaultExtraFields={editingWord.extraForms} defaultRemembered={editingWord.remembered} showAddMore={true}/>
      ) : null}
      </div>
  )
}

export default InnerD;
