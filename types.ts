
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum MessageType {
  TEXT = 'text',
  VIDEO = 'video',
  IMAGE = 'image',
  STICKER = 'sticker',
  GIF = 'gif'
}

export interface Message {
  id: string;
  role: Role;
  type: MessageType;
  content: string; 
  timestamp: Date;
  isStreaming?: boolean;
  isRead?: boolean;
  reactions?: Record<string, string>;
  metadata?: {
    isCustomSticker?: boolean;
    thumbnail?: string;
    startTime?: number; 
    isOnceView?: boolean;
    isOpened?: boolean;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  nickname?: string;
  avatar: string;
  persona: string;
  gender?: 'male' | 'female';
  online?: boolean;
  isMuted?: boolean;
  phoneNumber?: string;
  isGroup?: boolean;
  isRandom?: boolean;
}

// Added CallRecord interface to fix import errors in App.tsx, Sidebar.tsx, and storageService.ts
export interface CallRecord {
  id: string;
  roomId: string;
  type: 'audio' | 'video';
  timestamp: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  password?: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  avatar: string;
  isGuest?: boolean;
  // Added customStickers to fix "Object literal may only specify known properties" error in Auth.tsx
  customStickers?: string[];
  blockedNumbers?: string[];
  preferences?: {
    theme?: 'light' | 'dark';
    language?: 'bn' | 'en';
    chatWallpaper?: string;
  };
}
