import { useState, useEffect, useMemo } from 'react';
import { FaFire, FaCheck, FaLayerGroup, FaShuffle } from 'react-icons/fa6';
import type { AllWord } from '../types';

type MatchingModeProps = {
  words: AllWord[];
  onCorrect: (wordId: number) => void;
  onWrong: (wordId: number) => void;
  onFinish: () => void;
};

type Item = { id: string; wordId: number; text: string; type: 'orig' | 'trans' };

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MatchingMode({ words, onCorrect, onWrong, onFinish }: MatchingModeProps) {
  const [batchIndex, setBatchIndex] = useState(0);
  const BATCH_SIZE = 6;

  const currentBatchWords = useMemo(() => {
    return words.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
  }, [words, batchIndex]);

  const [leftItems, setLeftItems] = useState<Item[]>([]);
  const [rightItems, setRightItems] = useState<Item[]>([]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [wrongPairs, setWrongPairs] = useState<{ left: string; right: string } | null>(null);
  const [firstTryMap, setFirstTryMap] = useState<Record<number, boolean>>({});

  const [combo, setCombo] = useState(0);

  useEffect(() => {
    if (currentBatchWords.length > 0) {
      const left: Item[] = [];
      const right: Item[] = [];
      
      currentBatchWords.forEach((w) => {
        left.push({ id: `L-${w.id}`, wordId: w.id, text: w.text, type: 'orig' });
        right.push({ id: `R-${w.id}`, wordId: w.id, text: w.translate, type: 'trans' });
        setFirstTryMap(prev => ({ ...prev, [w.id]: prev[w.id] ?? true }));
      });

      setLeftItems(shuffleArray(left));
      setRightItems(shuffleArray(right));
      setMatchedIds(new Set());
      setSelectedLeft(null);
      setSelectedRight(null);
    } else if (words.length > 0) {
      onFinish();
    }
  }, [currentBatchWords, words.length]);

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      const leftItem = leftItems.find(i => i.id === selectedLeft);
      const rightItem = rightItems.find(i => i.id === selectedRight);

      if (leftItem && rightItem) {
        if (leftItem.wordId === rightItem.wordId) {
          // Correct match
          setMatchedIds(prev => {
            const next = new Set(prev);
            next.add(leftItem.wordId);
            return next;
          });
          
          if (firstTryMap[leftItem.wordId]) {
            onCorrect(leftItem.wordId);
          }
          
          setCombo(c => c + 1);

          setSelectedLeft(null);
          setSelectedRight(null);
        } else {
          // Wrong match
          setWrongPairs({ left: selectedLeft, right: selectedRight });
          setFirstTryMap(prev => ({ ...prev, [leftItem.wordId]: false }));
          onWrong(leftItem.wordId);
          
          setCombo(0);

          setTimeout(() => {
            setWrongPairs(null);
            setSelectedLeft(null);
            setSelectedRight(null);
          }, 800);
        }
      }
    }
  }, [selectedLeft, selectedRight, leftItems, rightItems]);

  useEffect(() => {
    if (currentBatchWords.length > 0 && matchedIds.size === currentBatchWords.length) {
      setTimeout(() => {
        setBatchIndex(b => b + 1);
      }, 600);
    }
  }, [matchedIds.size, currentBatchWords.length]);

  if (words.length === 0) {
    return <div className="text-center py-10 text-slate-400">No words to practice.</div>;
  }

  const [isShuffling, setIsShuffling] = useState(false);

  const wordsGuessed = batchIndex * BATCH_SIZE + matchedIds.size;
  const totalWords = words.length;
  const wordsLeft = totalWords - wordsGuessed;
  const progressPercent = Math.round((wordsGuessed / totalWords) * 100);

  const handleShuffle = () => {
    if (isShuffling) return;
    setIsShuffling(true);
    setTimeout(() => {
      setLeftItems(prev => shuffleArray(prev));
      setRightItems(prev => shuffleArray(prev));
      setIsShuffling(false);
    }, 250);
  };

  const renderItem = (item: Item, side: 'left' | 'right') => {
    const isSelected = side === 'left' ? selectedLeft === item.id : selectedRight === item.id;
    const isMatched = matchedIds.has(item.wordId);
    const isWrong = wrongPairs && ((side === 'left' && wrongPairs.left === item.id) || (side === 'right' && wrongPairs.right === item.id));

    let bgClass = "bg-slate-800 border-blue-500/30 text-blue-50 hover:border-blue-500 hover:bg-blue-900/20";

    if (isMatched) {
      bgClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 opacity-0 pointer-events-none scale-95 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
    } else if (isWrong) {
      bgClass = "bg-rose-900/60 border-rose-500 text-rose-300 animate-shake shadow-[0_0_15px_rgba(225,29,72,0.5)]";
    } else if (isSelected) {
      bgClass = "bg-blue-600 border-blue-400 text-white scale-[1.02] z-10 shadow-md";
    }

    const shuffleClass = isShuffling ? "opacity-0 scale-90 rotate-1" : "opacity-100";

    return (
      <button
        key={item.id}
        onClick={() => {
          if (isMatched || isWrong || isShuffling) return;
          if (side === 'left') {
            if (selectedLeft === item.id) setSelectedLeft(null);
            else setSelectedLeft(item.id);
          } else {
            if (selectedRight === item.id) setSelectedRight(null);
            else setSelectedRight(item.id);
          }
        }}
        className={`w-full min-h-[60px] p-2 sm:p-3 rounded-2xl border-2 transition-all duration-300 font-semibold text-xs sm:text-base flex items-center justify-center text-center break-words shadow-sm ${bgClass} ${shuffleClass}`}
      >
        {item.text}
      </button>
    );
  };

  return (
    <div className="w-full flex flex-col items-center -translate-y-2 sm:-translate-y-4">
      {/* Progress Bar (Unified with other modes, visually separate) */}
      <div className="flex flex-col items-center w-full max-w-sm mx-auto mb-4 sm:mb-8 z-10">
        <div className="flex justify-between w-full mb-1.5 px-1 items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Session Progress</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShuffle} 
              className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Shuffle columns"
            >
              <FaShuffle size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Shuffle</span>
            </button>
            <span className="text-[10px] font-bold text-slate-400">{wordsGuessed} / {totalWords}</span>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 shadow-inner flex">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Game Board */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center relative p-2 sm:p-4 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-emerald-900/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-900/0 to-slate-900/0 pointer-events-none" />

        {/* Stats Header */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-4 mb-6 text-center z-10">
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center shadow-md backdrop-blur-sm">
            <FaCheck className="text-blue-500 mb-1" size={16} />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guessed</span>
            <span className="text-lg sm:text-2xl font-black text-white">{wordsGuessed}</span>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-md backdrop-blur-sm">
            {combo > 0 ? (
              <>
                <FaFire className="text-orange-500 mb-1" size={16} />
                <span className="text-[9px] sm:text-[10px] font-bold text-orange-300 uppercase tracking-widest">Combo</span>
                <span className="text-lg sm:text-2xl font-black text-orange-400">x{combo}</span>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center opacity-60 transition-opacity duration-300">
                <FaFire className="text-slate-500 mb-1" size={16} />
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Combo</span>
                <span className="text-lg sm:text-2xl font-black text-slate-500">0</span>
              </div>
            )}
          </div>

          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center shadow-md backdrop-blur-sm">
            <FaLayerGroup className="text-blue-500 mb-1" size={16} />
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Left</span>
            <span className="text-lg sm:text-2xl font-black text-white">{wordsLeft}</span>
          </div>
        </div>
        
        {/* Game Columns */}
        <div className="flex w-full gap-8 sm:gap-16 z-10 pb-2">
          <div className="flex-1 flex flex-col gap-2 sm:gap-3">
            <div className="text-center text-[10px] sm:text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">Original</div>
            {leftItems.map(i => renderItem(i, 'left'))}
          </div>
          <div className="flex-1 flex flex-col gap-2 sm:gap-3">
            <div className="text-center text-[10px] sm:text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">Translation</div>
            {rightItems.map(i => renderItem(i, 'right'))}
          </div>
        </div>
      </div>
    </div>
  );
}
