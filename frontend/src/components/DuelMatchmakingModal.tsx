import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { getSessionUser, getToken } from '../services/api';
import { useNavigate } from 'react-router-dom';
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

interface DuelMatchmakingModalProps {
  onClose: () => void;
  dictionaries: any[];
}

export default function DuelMatchmakingModal({ onClose, dictionaries }: DuelMatchmakingModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'queuing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const duelSocketRef = useRef<Socket | null>(null);

  const navigate = useNavigate();
  const user = getSessionUser();

  useEffect(() => {
    return () => {
      if (duelSocketRef.current) {
        duelSocketRef.current.disconnect();
        duelSocketRef.current = null;
      }
    };
  }, []);

  const toggleDictionary = (id: number, language: string) => {
    setError(null);
    if (selectedLanguage && language !== selectedLanguage && selectedIds.length > 0) {
      setError(`All selected dictionaries must be the same language (${selectedLanguage}).`);
      return;
    }

    if (selectedIds.includes(id)) {
      const newIds = selectedIds.filter((d) => d !== id);
      setSelectedIds(newIds);
      if (newIds.length === 0) setSelectedLanguage(null);
    } else {
      setSelectedIds([...selectedIds, id]);
      setSelectedLanguage(language);
    }
  };

  const handleStart = () => {
    if (selectedIds.length === 0) {
      setError('Select at least one dictionary to start.');
      return;
    }

    setStatus('queuing');

    const duelSocket = io(getDuelSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: {
        token: getToken() || '',
      },
      reconnection: true,
      reconnectionAttempts: 5,
    });
    duelSocketRef.current = duelSocket;

    duelSocket.on('connect', () => {
      console.log('[Duel Socket] Connected:', duelSocket.id);

      const totalWins = user?.duelWins || 0;
      const totalGames = totalWins + (user?.duelLosses || 0);
      const winrate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

      duelSocket.emit('join_duel_queue', {
        userId: user?.id,
        username: user?.name,
        dictionaryIds: selectedIds,
        language: selectedLanguage,
        winrate,
      });
    });

    duelSocket.on('match_found', (data) => {
      console.log('[Duel Socket] Match found!', data);
      // Save game state to sessionStorage so user can return if they leave
      sessionStorage.setItem('activeDuel', JSON.stringify({
        matchData: data,
        myDictionaryIds: selectedIds,
        timestamp: Date.now(),
      }));
      setStatus('idle');
      navigate(`/duel/${data.roomId}`, { state: { matchData: data, myDictionaryIds: selectedIds } });
    });

    duelSocket.on('match_error', (data) => {
      console.error('[Duel Socket] Match error:', data);
      setError(data.message || 'Error creating match.');
      setStatus('idle');
      duelSocket.disconnect();
      duelSocketRef.current = null;
    });

    duelSocket.on('connect_error', (err) => {
      console.error('[Duel Socket] Connection error:', err.message);
      setError('Could not connect to game server.');
      setStatus('idle');
    });
  };

  const handleCancel = () => {
    if (status === 'queuing') {
      if (duelSocketRef.current) {
        duelSocketRef.current.emit('leave_duel_queue');
        duelSocketRef.current.disconnect();
        duelSocketRef.current = null;
      }
      setStatus('idle');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4" onClick={handleCancel}>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Select Dictionaries</h2>
          <button onClick={handleCancel} className="text-slate-400 hover:text-white transition-colors">
            <FaTimes size={18} />
          </button>
        </div>

        {/* Dictionary list */}
        <div className="p-4 flex-1 max-h-[50vh] overflow-y-auto flex flex-col gap-2">
          {dictionaries.length === 0 ? (
            <div className="text-slate-500 text-center py-8">You don't have any dictionaries yet.</div>
          ) : (
            dictionaries.map((dict) => {
              const isSelected = selectedIds.includes(dict.dictionaryId);
              const isDisabled = selectedLanguage !== null && dict.language !== selectedLanguage && selectedIds.length > 0;
              
              return (
                <button
                  key={dict.dictionaryId}
                  onClick={() => !isDisabled && toggleDictionary(dict.dictionaryId, dict.language)}
                  disabled={isDisabled}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    isSelected 
                      ? 'bg-blue-600/15 border-blue-500' 
                      : isDisabled 
                        ? 'border-slate-700 opacity-40 cursor-not-allowed'
                        : 'border-slate-700 hover:border-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {dict.dictionaryName}
                    </span>
                    <span className="text-xs text-slate-400 flex gap-1.5 items-center mt-0.5">
                      {dict.language} · {dict.amountWord} words
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                  }`}>
                    {isSelected && <FaCheckCircle className="text-white" size={12} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          {error && (
            <div className="mb-3 text-rose-400 text-xs flex items-center gap-2 bg-rose-500/10 p-2 rounded-lg">
              <FaExclamationTriangle className="shrink-0" /> {error}
            </div>
          )}

          {status === 'queuing' ? (
            <div className="flex items-center justify-center gap-3 py-3">
              <FaSpinner className="animate-spin text-blue-500 text-xl" />
              <span className="text-white font-semibold animate-pulse">Searching for opponent...</span>
            </div>
          ) : (
            <button
              onClick={handleStart}
              disabled={selectedIds.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Find Match
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
