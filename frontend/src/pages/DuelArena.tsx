import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { playNotificationSound } from '../services/socket';
import { getSessionUser, getToken } from '../services/api';
import { FaBolt, FaArrowLeft } from 'react-icons/fa';
import { io, Socket } from 'socket.io-client';

const getDuelSocketUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') + '/duel';
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin + '/duel';
  }
  return 'http://127.0.0.1:5000/duel';
};

export default function DuelArena() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getSessionUser();

  // Try to restore from sessionStorage if navigated away and came back
  const saved = sessionStorage.getItem('activeDuel');
  const restoredData = saved ? JSON.parse(saved) : null;

  const matchData = location.state?.matchData || restoredData?.matchData;
  const [rounds] = useState<any[]>(matchData?.rounds || []);
  const [players] = useState<any[]>(matchData?.players || []);

  // Game state
  const [phase, setPhase] = useState<'intro' | 'playing' | 'finished'>('intro');
  const [currentRound, setCurrentRound] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8000);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealedCorrectOption, setRevealedCorrectOption] = useState<string | null>(null);
  const [roundStatus, setRoundStatus] = useState<'playing' | 'revealed'>('playing');

  const timerRef = useRef<any>(null);
  const duelSocketRef = useRef<Socket | null>(null);

  const me = players.find((p: any) => p.userId === user?.id) || players[0];
  const opponent = players.find((p: any) => p.userId !== user?.id) || players[1];

  // --- INTRO ANIMATION ---
  useEffect(() => {
    if (!matchData) {
      navigate('/mainDictionary');
      return;
    }
    // Auto-transition from intro to playing after 3 seconds
    if (phase === 'intro') {
      const t = setTimeout(() => setPhase('playing'), 3000);
      return () => clearTimeout(t);
    }
  }, [phase, matchData]);

  // --- SOCKET ---
  useEffect(() => {
    if (!matchData) return;

    const duelSocket = io(getDuelSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: {
        token: getToken() || '',
      },
      reconnection: true,
    });
    duelSocketRef.current = duelSocket;

    duelSocket.on('connect', () => {
      console.log('[DuelArena Socket] Connected:', duelSocket.id);
      duelSocket.emit('rejoin_duel', { roomId });
    });

    duelSocket.on('answer_result', (data: { roundIndex: number; pointsEarned: number; totalScore: number; isCorrect: boolean; correctOption?: string }) => {
      setMyScore(data.totalScore);
      if (data.correctOption) {
        setRevealedCorrectOption(data.correctOption);
      }
      if (data.isCorrect) {
        playNotificationSound();
      }
    });

    duelSocket.on('opponent_scored', (data: { score: number; totalScore?: number }) => {
      if (typeof data.totalScore === 'number') {
        setOpponentScore(data.totalScore);
      } else {
        setOpponentScore(prev => prev + data.score);
      }
    });

    return () => {
      if (duelSocketRef.current) {
        duelSocketRef.current.emit('leave_duel', { roomId });
        duelSocketRef.current.disconnect();
        duelSocketRef.current = null;
      }
    };
  }, []);

  // --- TIMER ---
  useEffect(() => {
    if (phase !== 'playing' || rounds.length === 0) return;
    if (roundStatus !== 'playing') return;

    const limit = rounds[currentRound].timeLimit;
    setTimeLeft(limit);

    const interval = 50;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= interval) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - interval;
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [currentRound, roundStatus, phase]);

  // --- Save game state so user can return ---
  useEffect(() => {
    if (phase === 'finished') {
      sessionStorage.removeItem('activeDuel');
    }
  }, [phase]);

  const handleTimeUp = () => {
    if (selectedOption) return;
    submitAnswer('TIMEOUT');
  };

  const handleOptionClick = (option: string) => {
    if (roundStatus !== 'playing') return;
    submitAnswer(option);
  };

  const submitAnswer = (option: string) => {
    clearInterval(timerRef.current);
    setSelectedOption(option);
    setRoundStatus('revealed');

    if (duelSocketRef.current) {
      duelSocketRef.current.emit('submit_answer', {
        roomId,
        roundIndex: currentRound,
        selectedOption: option,
      });
    }

    setTimeout(() => {
      if (currentRound < rounds.length - 1) {
        setSelectedOption(null);
        setRevealedCorrectOption(null);
        setRoundStatus('playing');
        setCurrentRound(prev => prev + 1);
      } else {
        setPhase('finished');
      }
    }, 1500);
  };

  if (!matchData || rounds.length === 0) return null;

  // ==================== INTRO SCREEN ====================
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Animated VS screen */}
        <div className="flex items-center gap-6 sm:gap-12 w-full max-w-md justify-center">
          {/* Player 1 (ME) */}
          <div className="flex flex-col items-center gap-2 animate-slide-in-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black uppercase shadow-lg shadow-blue-500/30">
              {(me?.username || '?')[0]}
            </div>
            <span className="text-white font-bold text-sm sm:text-base truncate max-w-[120px]">{me?.username}</span>
            <span className="text-blue-400 text-xs font-semibold">
              Winrate: {me?.winrate ?? 0}%
            </span>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-4xl sm:text-5xl font-black text-slate-500 italic select-none">VS</span>
          </div>

          {/* Player 2 (OPPONENT) */}
          <div className="flex flex-col items-center gap-2 animate-slide-in-right">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black uppercase shadow-lg shadow-rose-500/30">
              {(opponent?.username || '?')[0]}
            </div>
            <span className="text-white font-bold text-sm sm:text-base truncate max-w-[120px]">{opponent?.username}</span>
            <span className="text-rose-400 text-xs font-semibold">
              Winrate: {opponent?.winrate ?? 0}%
            </span>
          </div>
        </div>

        {/* Loading dots */}
        <div className="mt-10 flex items-center gap-1">
          <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
        <p className="text-slate-500 text-sm mt-3 font-medium">Match starting...</p>

        <style>{`
          @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-60px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(60px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-slide-in-left { animation: slideInLeft 0.6s ease-out forwards; }
          .animate-slide-in-right { animation: slideInRight 0.6s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  // ==================== FINISHED SCREEN ====================
  if (phase === 'finished') {
    const isWinner = myScore > opponentScore;
    const isDraw = myScore === opponentScore;

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-sm w-full text-center shadow-2xl">
          <h1 className={`text-3xl font-black uppercase tracking-widest mb-1 ${isWinner ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-rose-400'}`}>
            {isWinner ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
          </h1>
          <p className="text-slate-400 mb-6 text-sm">
            {isWinner ? '+50 XP' : isDraw ? '+10 XP' : '+10 XP'}
          </p>

          <div className="flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-xl">
            <div className="flex flex-col items-center">
              <span className="text-slate-400 text-xs mb-1">{me?.username}</span>
              <span className="text-2xl font-black text-blue-400">{myScore}</span>
            </div>
            <span className="text-slate-600 font-black text-sm">VS</span>
            <div className="flex flex-col items-center">
              <span className="text-slate-400 text-xs mb-1">{opponent?.username}</span>
              <span className="text-2xl font-black text-rose-400">{opponentScore}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/mainDictionary')}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
          >
            Back to Dictionaries
          </button>
        </div>
      </div>
    );
  }

  // ==================== PLAYING SCREEN ====================
  const currentWord = rounds[currentRound];
  const progressPercent = ((currentRound) / rounds.length) * 100;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-between p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/mainDictionary')} className="text-slate-500 hover:text-white p-2">
            <FaArrowLeft size={18} />
          </button>
          <span className="text-slate-400 font-semibold text-xs tracking-widest uppercase">
            Round {currentRound + 1} / {rounds.length}
          </span>
          <div className="w-9"></div>
        </div>

        {/* Overall progress */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Players HUD */}
        <div className="flex justify-between items-center bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
          <div className="flex flex-col gap-1 w-[40%]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-white truncate">{me?.username}</span>
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1"><FaBolt size={10} /> {myScore}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (myScore / 1000) * 100)}%` }}></div>
            </div>
          </div>
          <span className="text-slate-600 font-bold text-xs px-2">VS</span>
          <div className="flex flex-col gap-1 w-[40%]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1"><FaBolt size={10} /> {opponentScore}</span>
              <span className="text-xs font-semibold text-white truncate text-right">{opponent?.username}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex justify-end">
              <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${Math.min(100, (opponentScore / 1000) * 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Center — Timer + Word */}
      <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center my-4">
        {/* Timer */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              stroke={timeLeft < 3000 ? '#f43f5e' : timeLeft < 5000 ? '#f59e0b' : '#3b82f6'}
              strokeWidth="6"
              strokeDasharray="226"
              strokeDashoffset={226 - (226 * (timeLeft / currentWord.timeLimit))}
              className="transition-all duration-75 ease-linear"
              strokeLinecap="round"
            />
          </svg>
          <span className={`text-lg font-bold tabular-nums ${timeLeft < 3000 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
            {(timeLeft / 1000).toFixed(1)}
          </span>
        </div>

        {/* Word */}
        <div className="w-full bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg flex flex-col items-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Translate</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white break-words">
            {currentWord.text}
          </h2>
        </div>
      </div>

      {/* Options */}
      <div className="w-full max-w-md grid grid-cols-2 gap-2.5 pb-4">
        {currentWord.options.map((opt: string, i: number) => {
          let btnClass = 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-slate-600';

          if (roundStatus === 'revealed') {
            const correctOpt = revealedCorrectOption ?? currentWord.correctOption;
            if (opt === correctOpt) {
              btnClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 scale-[1.02]';
            } else if (opt === selectedOption) {
              btnClass = 'bg-rose-500/15 border-rose-500 text-rose-400 line-through opacity-60';
            } else {
              btnClass = 'bg-slate-800 border-slate-800 text-slate-700 opacity-40';
            }
          }

          return (
            <button
              key={i}
              disabled={roundStatus !== 'playing'}
              onClick={() => handleOptionClick(opt)}
              className={`p-3.5 rounded-xl border text-base sm:text-lg font-semibold transition-all duration-150 flex items-center justify-center active:scale-95 break-words ${btnClass}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
