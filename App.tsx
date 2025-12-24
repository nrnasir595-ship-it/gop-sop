
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Auth from './components/Auth';
import DashboardHome from './components/DashboardHome';
import CallScreen from './components/CallScreen';
import { Message, ChatRoom, Role, UserProfile, CallRecord, MessageType } from './types';
import { createChatSession, sendMessageStream } from './services/geminiService';
import { storage } from './services/storageService';
import { RealtimeService } from './services/realtimeService';
import { Chat } from '@google/genai';

const INITIAL_ROOMS: ChatRoom[] = [
  { id: '1', name: 'Gop Sop Assistant', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', persona: 'Assistant', online: true, isMuted: false, phoneNumber: 'assistant' }
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => storage.getUser());
  const [rooms, setRooms] = useState<ChatRoom[]>(() => storage.getRooms(INITIAL_ROOMS));
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  const [activeCall, setActiveCall] = useState<{ roomId: string, type: 'audio' | 'video' } | null>(null);
  const [callHistory, setCallHistory] = useState<CallRecord[]>(() => storage.getCalls());
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [isSecurityBlur, setIsSecurityBlur] = useState(false);
  
  const chatSessions = useRef<Record<string, Chat>>({});
  const realtimeUnsubscribes = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      RealtimeService.syncUserProfile(user);
      const heartbeat = setInterval(() => RealtimeService.syncUserProfile(user), 30000);
      return () => clearInterval(heartbeat);
    }
  }, [user]);

  // CRITICAL: Safety check for activeRoom to prevent crash if room is deleted or stale
  useEffect(() => {
    if (activeRoomId) {
      const exists = rooms.find(r => r.id === activeRoomId);
      if (!exists) {
        console.warn('Active room not found in rooms list, resetting...');
        setActiveRoomId(null);
        setShowSidebarOnMobile(true);
      }
    }
  }, [activeRoomId, rooms]);

  useEffect(() => {
    const handleVisibilityChange = () => setIsSecurityBlur(document.visibilityState === 'hidden');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.shiftKey && (e.key === '4' || e.key === 's'))) {
        setIsSecurityBlur(true);
        alert(user?.preferences?.language === 'bn' ? 'নিরাপত্তার স্বার্থে স্ক্রিনশট নেওয়া নিষেধ!' : 'Screenshots are disabled for privacy!');
        setTimeout(() => setIsSecurityBlur(false), 2000);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', () => setIsSecurityBlur(true));
    window.addEventListener('focus', () => setIsSecurityBlur(false));
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      RealtimeService.listenForCalls(user.phoneNumber, (callerPhone, type) => {
        if (user.blockedNumbers?.includes(callerPhone)) return;
        let room = rooms.find(r => r.phoneNumber === callerPhone);
        if (!room) {
          room = { id: 'temp_' + callerPhone, name: 'Friend (' + callerPhone + ')', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${callerPhone}`, persona: 'Real Friend', phoneNumber: callerPhone, online: true };
          setRooms(prev => [...prev, room!]);
        }
        if (!activeCall) setActiveCall({ roomId: room.id, type });
      });
    }
  }, [user, rooms, activeCall]);

  useEffect(() => {
    const loadMessages = async () => {
      if (user) {
        setIsDecrypting(true);
        const msgs = await storage.getMessages(user.phoneNumber);
        setMessages(msgs);
        setIsDecrypting(false);
      }
    };
    loadMessages();
  }, [user]);

  useEffect(() => {
    if (activeRoomId && user) {
      const room = rooms.find(r => r.id === activeRoomId);
      if (room && room.phoneNumber !== 'assistant') {
        if (!realtimeUnsubscribes.current[activeRoomId]) {
          const channelId = room.isGroup ? RealtimeService.getGroupChannelId(room.id) : RealtimeService.getDirectChannelId(user.phoneNumber, room.phoneNumber!);
          RealtimeService.subscribeToChannel(channelId, user.phoneNumber, (data) => {
            if (!room.isGroup && user.blockedNumbers?.includes(room.phoneNumber!)) return;
            setMessages(prev => {
              const currentRoomMsgs = prev[activeRoomId] || [];
              if ('deleted' in data && data.deleted) return { ...prev, [activeRoomId]: currentRoomMsgs.filter(m => m.id !== data.id) };
              if ('reaction' in data && data.reaction) return { ...prev, [activeRoomId]: currentRoomMsgs.map(m => m.id === data.id ? { ...m, reactions: { ...(m.reactions || {}), [data.reaction!.sender]: data.reaction!.emoji } } : m) };
              if (!('role' in data)) return prev;
              if (currentRoomMsgs.find(m => m.id === data.id)) return prev;
              return { ...prev, [activeRoomId]: [...currentRoomMsgs, data] };
            });
          });
          realtimeUnsubscribes.current[activeRoomId] = true;
        }
      }
    }
  }, [activeRoomId, user, rooms]);

  useEffect(() => { storage.saveUser(user); }, [user]);
  useEffect(() => { storage.saveRooms(rooms); }, [rooms]);
  useEffect(() => { if (user && !isDecrypting) storage.saveMessages(messages, user.phoneNumber); }, [messages, user, isDecrypting]);
  useEffect(() => { storage.saveCalls(callHistory); }, [callHistory]);

  const handleSendMessage = useCallback(async (content: string, type: MessageType = MessageType.TEXT, metadata?: any) => {
    if (!content.trim() && type === MessageType.TEXT) return;
    if (!activeRoomId || !user) return;
    const room = rooms.find(r => r.id === activeRoomId);
    
    // Safety check: if room doesn't exist, don't proceed
    if (!room) return;

    const userMsg: Message = { id: Date.now().toString(), role: Role.USER, type, content, timestamp: new Date(), isRead: false, metadata, reactions: {} };

    if (room.phoneNumber !== 'assistant') {
      const channelId = room.isGroup ? RealtimeService.getGroupChannelId(room.id) : RealtimeService.getDirectChannelId(user.phoneNumber, room.phoneNumber!);
      RealtimeService.sendMessageToChannel(channelId, user.phoneNumber, content, type, metadata);
      setMessages(prev => ({ ...prev, [activeRoomId]: [...(prev[activeRoomId] || []), userMsg] }));
    } else {
      setMessages(prev => ({ ...prev, [activeRoomId]: [...(prev[activeRoomId] || []), userMsg] }));
      if (type === MessageType.TEXT) {
        setIsTyping(true);
        const modelMsgId = (Date.now() + 1).toString();
        const modelMsg: Message = { id: modelMsgId, role: Role.MODEL, type: MessageType.TEXT, content: '', timestamp: new Date(), isStreaming: true, reactions: {} };
        setMessages(prev => ({ ...prev, [activeRoomId]: [...(prev[activeRoomId] || []), modelMsg] }));
        let fullContent = '';
        if (!chatSessions.current[activeRoomId]) chatSessions.current[activeRoomId] = createChatSession(room.persona || '');
        try {
          const stream = sendMessageStream(chatSessions.current[activeRoomId], content);
          for await (const chunk of stream) {
            fullContent += chunk;
            setMessages(prev => {
              // Safety check inside async callback
              if (!prev[activeRoomId]) return prev;
              const msgs = [...prev[activeRoomId]];
              const idx = msgs.findIndex(m => m.id === modelMsgId);
              if (idx !== -1) msgs[idx] = { ...msgs[idx], content: fullContent };
              return { ...prev, [activeRoomId]: msgs };
            });
          }
        } finally {
          setIsTyping(false);
          setMessages(prev => {
             // Safety check inside async callback
            if (!prev[activeRoomId]) return prev;
            const msgs = [...prev[activeRoomId]];
            const idx = msgs.findIndex(m => m.id === modelMsgId);
            if (idx !== -1) msgs[idx] = { ...msgs[idx], isStreaming: false };
            return { ...prev, [activeRoomId]: msgs };
          });
        }
      }
    }
  }, [activeRoomId, rooms, user]);

  const handleUnsendMessage = useCallback((msgId: string) => {
    if (!activeRoomId || !user) return;
    const room = rooms.find(r => r.id === activeRoomId);
    if (room && room.phoneNumber !== 'assistant') {
      const channelId = room.isGroup ? RealtimeService.getGroupChannelId(room.id) : RealtimeService.getDirectChannelId(user.phoneNumber, room.phoneNumber!);
      RealtimeService.unsendMessageFromChannel(channelId, msgId);
    }
    setMessages(prev => {
      if (!prev[activeRoomId]) return prev;
      return {
        ...prev,
        [activeRoomId]: prev[activeRoomId].filter(m => m.id !== msgId)
      };
    });
  }, [activeRoomId, user, rooms]);

  const handleReactToMessage = useCallback((msgId: string, emoji: string | null) => {
    if (!activeRoomId || !user) return;
    const room = rooms.find(r => r.id === activeRoomId);
    if (room && room.phoneNumber !== 'assistant') {
      const channelId = room.isGroup ? RealtimeService.getGroupChannelId(room.id) : RealtimeService.getDirectChannelId(user.phoneNumber, room.phoneNumber!);
      RealtimeService.reactToMessageInChannel(channelId, user.phoneNumber, msgId, emoji);
    }
    setMessages(prev => {
      if (!prev[activeRoomId]) return prev;
      return {
        ...prev,
        [activeRoomId]: prev[activeRoomId].map(m => {
          if (m.id === msgId) {
            const reactions = { ...(m.reactions || {}) };
            if (emoji) reactions[user.phoneNumber] = emoji;
            else delete reactions[user.phoneNumber];
            return { ...m, reactions };
          }
          return m;
        })
      };
    });
  }, [activeRoomId, user, rooms]);

  const toggleMute = useCallback((roomId: string) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, isMuted: !r.isMuted } : r));
  }, []);

  const handleUpdateNickname = useCallback((roomId: string, newNickname: string) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, nickname: newNickname } : r));
  }, []);

  const handleBlockUser = useCallback((phoneNumber: string) => {
    if (!user) return;
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        blockedNumbers: [...(prev.blockedNumbers || []), phoneNumber]
      };
    });
    // Safely close the chat
    setActiveRoomId(null);
    setShowSidebarOnMobile(true);
  }, [user]);

  const handleDeleteChat = useCallback(() => {
    if (!activeRoomId) return;
    const roomIdToDelete = activeRoomId;
    
    // 1. Close the chat view FIRST
    setActiveRoomId(null);
    setShowSidebarOnMobile(true);

    // 2. Then remove messages (to avoid rendering issues while closing)
    setTimeout(() => {
      setMessages(prev => {
         const { [roomIdToDelete]: deleted, ...rest } = prev;
         return rest;
      });
      // Optionally remove from room list if you want to completely delete the room entry
      // setRooms(prev => prev.filter(r => r.id !== roomIdToDelete));
    }, 100);
  }, [activeRoomId]);

  if (!user || isUpgrading) {
    return (
      <Auth 
        onAuthSuccess={(profile) => { 
          setUser(profile); 
          setIsUpgrading(false); 
        }} 
        onBack={user ? () => setIsUpgrading(false) : undefined} 
      />
    );
  }

  // Robust check for active room to prevent crash
  const activeRoom = activeRoomId ? rooms.find(r => r.id === activeRoomId) : null;

  return (
    <div className={`relative flex h-screen w-full items-center justify-center transition-all duration-500 bg-transparent z-10 ${user?.preferences?.theme === 'dark' ? 'dark-app' : ''} ${isSecurityBlur ? 'blur-3xl grayscale brightness-50 pointer-events-none scale-110' : ''}`}>
      {activeCall && <CallScreen room={rooms.find(r => r.id === activeCall.roomId)!} allRooms={rooms} type={activeCall.type} onEnd={() => setActiveCall(null)} theme={user?.preferences?.theme} />}
      <div className={`relative flex h-full w-full max-w-[1600px] shadow-2xl overflow-hidden md:rounded-xl ${user?.preferences?.theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'}`}>
        <div className={`flex flex-col h-full border-r ${user?.preferences?.theme === 'dark' ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'} ${showSidebarOnMobile ? 'w-full md:w-[30%] lg:w-[420px]' : 'hidden md:flex md:w-[30%] lg:w-[420px]'}`}>
          <Sidebar 
            rooms={rooms} 
            activeRoomId={activeRoomId || ''} 
            onSelectRoom={(r) => { 
              // Safe add if not exists, but ensure we don't duplicate
              setRooms(prev => {
                if (prev.find(x => x.id === r.id)) return prev;
                return [...prev, r];
              });
              setActiveRoomId(r.id); 
              setShowSidebarOnMobile(false); 
            }} 
            onUpdateRoom={(r) => setRooms(prev => prev.map(x => x.id === r.id ? r : x))} 
            user={user!} 
            onUpdateUser={setUser} 
            onLogout={() => setUser(null)} 
            onDeleteAccount={() => { 
              storage.deleteAccount(user!.email, user!.phoneNumber); 
              setUser(null); 
            }} 
            callHistory={callHistory} 
            activeCall={activeCall} 
            lastMessages={{}} 
          />
        </div>
        <main className={`flex-1 min-w-0 h-full ${!showSidebarOnMobile ? 'w-full' : 'hidden md:flex'}`}>
          {activeRoom ? (
            <ChatWindow 
              room={activeRoom} 
              messages={messages[activeRoomId!] || []} 
              onSendMessage={handleSendMessage} 
              onUnsendMessage={handleUnsendMessage}
              onReactToMessage={handleReactToMessage}
              onDeleteChat={handleDeleteChat}
              onBlockUser={handleBlockUser}
              onUpdateNickname={handleUpdateNickname}
              onToggleMute={toggleMute}
              user={user!} 
              onBack={() => {
                setActiveRoomId(null);
                setShowSidebarOnMobile(true);
              }} 
              globalCallState={activeCall} 
              onSetGlobalCallState={setActiveCall} 
              isTyping={isTyping} 
              onTriggerUpgrade={() => setIsUpgrading(true)}
            />
          ) : <DashboardHome theme={user?.preferences?.theme} language={user?.preferences?.language} />}
        </main>
      </div>
    </div>
  );
};

export default App;
