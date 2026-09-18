export type AllWord = {
  dictionaryId: number
  id: number
  important: boolean
  isFavorite: boolean
  remembered: boolean
  text: string
  translate: string
  transcription?: string
  partOfSpeech?: string
  extraForms?: string[]
  createdAt?: string
  nextReviewDate?: string | null
  interval?: number
};

export type WordToShow = [string, AllWord[]][]

export type DictionarySettings = {
  coverImage?: string;
  showName: boolean;
  showLanguage: boolean;
  showFlag: boolean;
  showProgress: boolean;
  showImported: boolean;
  isImported: boolean;
  isPinned?: boolean;
  isPublic?: boolean;
  tags?: string[];
  editOpacity?: number;
  pinOpacity?: number;
}

export type MainDictionaries = {
  dictionaryId: number;
  dictionaryName: string;
  language: string;
  amountWord: number;
  rememberedWords: number;
  views?: number;
  averageRating?: number;
  totalRatings?: number;
} & DictionarySettings;

export type User = {
  id: number;
  name: string;
  email: string;
  streakCount: number;
  lastPracticeDate?: string;
  avatarUrl?: string;
  lastSeen?: string | null;
  isOnline?: boolean;
};

export type UserStats = {
  totalDictionaries: number;
  totalWords: number;
  learnedWords: number;
};

export type FriendItem = {
  friendshipId: number;
  friend: User;
  stats: UserStats;
  unreadCount: number;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: number;
  } | null;
};

export type FriendRequestItem = {
  id: number;
  createdAt: string;
  user: User;
  stats: UserStats;
};

export type SearchUserItem = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  streakCount: number;
  lastPracticeDate?: string;
  stats: UserStats;
  relationship: 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED';
  requestId?: number | null;
};

export type DirectMessageItem = {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  isRead: boolean;
  isEdited?: boolean;
  replyToId?: number | null;
  replyToText?: string | null;
  replyToSenderName?: string | null;
  reactions?: Record<string, number[]>;
  createdAt: string;
};
