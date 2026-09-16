import { io, Socket } from 'socket.io-client';
import { getToken, getSessionUser } from './api';

let socket: Socket | null = null;

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:5000';
};

const SOCKET_URL = getSocketUrl();

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(customUserId?: number, customToken?: string): Socket {
  const token = customToken || getToken() || '';
  const user = getSessionUser();
  const userId = customUserId || user?.id;

  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: {
      token,
      userId,
    },
    query: {
      userId: String(userId || ''),
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[WebSocket Client] Connected to real-time gateway with ID:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket Client] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[WebSocket Client] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now);
    gain1.gain.setValueAtTime(0.07, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.07, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch (e) {

  }
}

export function formatLastSeen(lastSeen?: string | null, isOnline?: boolean): string {
  if (isOnline) return 'Online';
  if (!lastSeen) return 'Offline';

  const d = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 0 || isNaN(diffMs)) return 'Offline';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
