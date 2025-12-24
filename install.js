
const fs = require('fs');
const path = require('path');

const files = {
  'package.json': `{
  "name": "gop-sop-chat",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@google/genai": "^0.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.2.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3"
  }
}`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`,
  'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Gop Sop | গল্প সল্প</title>
    <link rel="manifest" href="manifest.json" />
    <meta name="theme-color" content="#4f46e5" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: { extend: { colors: { brand: { primary: '#4f46e5', secondary: '#0d9488' } } } }
      }
    </script>
    <style>
      body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f3f4f6; overflow: hidden; user-select: none; }
      .whatsapp-pattern-bg { background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-repeat: repeat; background-size: 400px; opacity: 0.04; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
  </head>
  <body oncontextmenu="return false;">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js');
        });
      }
    </script>
  </body>
</html>`,
  'public/manifest.json': `{
  "name": "Gop Sop | গল্প সল্প",
  "short_name": "Gop Sop",
  "description": "গল্প সল্প - একটি আধুনিক এবং নিরাপদ চ্যাট অ্যাপ্লিকেশন।",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#4f46e5",
  "theme_color": "#4f46e5",
  "orientation": "portrait",
  "icons": [
    { "src": "https://api.dicebear.com/7.x/avataaars/svg?seed=GopSopLogo", "sizes": "192x192", "type": "image/svg+xml", "purpose": "any" },
    { "src": "https://api.dicebear.com/7.x/avataaars/svg?seed=GopSopLogo", "sizes": "512x512", "type": "image/svg+xml", "purpose": "any" }
  ]
}`,
  'public/sw.js': `const CACHE_NAME = 'gopsop-v2';
const ASSETS = ['./', './index.html', './manifest.json'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); });
self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });`,
  'public/_redirects': `/* /index.html 200`,
  'index.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  'types.ts': `export enum Role { USER = 'user', MODEL = 'model' }
export enum MessageType { TEXT = 'text', VIDEO = 'video', IMAGE = 'image', STICKER = 'sticker', GIF = 'gif' }
export interface Message { id: string; role: Role; type: MessageType; content: string; timestamp: Date; isStreaming?: boolean; isRead?: boolean; reactions?: Record<string, string>; metadata?: any; }
export interface ChatRoom { id: string; name: string; nickname?: string; avatar: string; persona: string; gender?: 'male' | 'female'; online?: boolean; isMuted?: boolean; phoneNumber?: string; isGroup?: boolean; lastSeen?: string; isRandom?: boolean; disappearingTimer?: number; }
export interface CallRecord { id: string; roomId: string; type: 'audio' | 'video'; timestamp: Date; }
export interface UserProfile { name: string; email: string; password?: string; gender: 'male' | 'female'; phoneNumber: string; avatar: string; isGuest?: boolean; customStickers?: string[]; blockedNumbers?: string[]; preferences?: any; }`,
  'services/geminiService.ts': `import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
export const createChatSession = (systemInstruction) => ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction } });
export async function* sendMessageStream(chat, message) {
  try {
    const stream = await chat.sendMessageStream({ message });
    for await (const chunk of stream) yield chunk.text || "";
  } catch (error) { yield "Error: " + error.message; }
}`,
  'services/storageService.ts': `const KEYS = { USER: 'gop_sop_user', ACCOUNTS: 'gop_sop_accounts', ROOMS: 'gop_sop_rooms', MESSAGES: 'gop_sop_msgs', CALLS: 'gop_sop_calls' };
export const storage = {
  saveUser: (u) => u ? localStorage.setItem(KEYS.USER, JSON.stringify(u)) : localStorage.removeItem(KEYS.USER),
  getUser: () => { try { return JSON.parse(localStorage.getItem(KEYS.USER)); } catch { return null; } },
  registerAccount: (u) => { const acc = storage.getAllAccounts(); if(acc[u.email]) return false; acc[u.email] = u; localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(acc)); return true; },
  getAllAccounts: () => { try { return JSON.parse(localStorage.getItem(KEYS.ACCOUNTS)) || {}; } catch { return {}; } },
  verifyAccount: (e, p) => { const acc = storage.getAllAccounts(); const u = acc[e]; return (u && u.password === p) ? u : null; },
  saveRooms: (r) => localStorage.setItem(KEYS.ROOMS, JSON.stringify(r)),
  getRooms: (def) => { try { return JSON.parse(localStorage.getItem(KEYS.ROOMS)) || def; } catch { return def; } },
  getMessages: async (uid) => { try { const d = localStorage.getItem(KEYS.MESSAGES + '_' + uid); return d ? JSON.parse(d, (k,v) => k==='timestamp'?new Date(v):v) : {}; } catch { return {}; } },
  saveMessages: (m, uid) => localStorage.setItem(KEYS.MESSAGES + '_' + uid, JSON.stringify(m)),
  getCalls: () => { try { return JSON.parse(localStorage.getItem(KEYS.CALLS) || '[]').map(c => ({...c, timestamp: new Date(c.timestamp)})); } catch { return []; } },
  saveCalls: (c) => localStorage.setItem(KEYS.CALLS, JSON.stringify(c)),
  deleteAccount: (email, phone) => { localStorage.removeItem(KEYS.USER); localStorage.removeItem(KEYS.MESSAGES + '_' + phone); const acc = storage.getAllAccounts(); delete acc[email]; localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(acc)); }
};`,
  'services/realtimeService.ts': `// Simplified Mock Realtime Service for Local Demo
export const RealtimeService = {
  getDirectChannelId: (p1, p2) => [p1, p2].sort().join('_'),
  getGroupChannelId: (id) => 'group_' + id,
  syncUserProfile: (u) => {},
  fetchProfile: (p, cb) => cb({ name: 'User '+p, phoneNumber: p, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed='+p, online: true }),
  subscribeToChannel: (cid, phone, cb) => {},
  sendMessageToChannel: (cid, phone, content, type, meta) => {},
  markMessageAsOpened: (cid, mid) => {},
  unsendMessageFromChannel: (cid, mid) => {},
  reactToMessageInChannel: (cid, phone, mid, emoji) => {},
  listenForCalls: (phone, cb) => {},
  findRandomPartner: (p, n, g, cb) => { setTimeout(() => cb({id:'rand', name:'Random User', phoneNumber:'999', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Rand', isRandom:true}), 2000); return () => {}; }
};`,
  'App.tsx': `import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Auth from './components/Auth';
import DashboardHome from './components/DashboardHome';
import CallScreen from './components/CallScreen';
import { storage } from './services/storageService';
import { createChatSession, sendMessageStream } from './services/geminiService';

export default function App() {
  const [user, setUser] = useState(() => storage.getUser());
  const [rooms, setRooms] = useState(() => storage.getRooms([{id:'1', name:'Gop Sop AI', phoneNumber:'assistant', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=AI', persona:'Assistant'}]));
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState({});
  const [activeCall, setActiveCall] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => { if(user) { const load = async () => setMessages(await storage.getMessages(user.phoneNumber)); load(); } }, [user]);
  useEffect(() => { storage.saveUser(user); }, [user]);
  useEffect(() => { storage.saveRooms(rooms); }, [rooms]);
  useEffect(() => { if(user) storage.saveMessages(messages, user.phoneNumber); }, [messages]);

  const handleSend = async (content, type='text', meta) => {
    if(!activeRoomId || !user) return;
    const newMsg = { id: Date.now().toString(), role: 'user', type, content, timestamp: new Date(), isRead: false, metadata: meta, reactions: {} };
    setMessages(prev => ({...prev, [activeRoomId]: [...(prev[activeRoomId]||[]), newMsg]}));
    
    const room = rooms.find(r => r.id === activeRoomId);
    if(room.phoneNumber === 'assistant' && type === 'text') {
      setIsTyping(true);
      const botMsgId = (Date.now()+1).toString();
      let botText = "";
      setMessages(prev => ({...prev, [activeRoomId]: [...(prev[activeRoomId]||[]), {id: botMsgId, role: 'model', type: 'text', content: '', timestamp: new Date(), isStreaming: true}]}));
      try {
        const chat = createChatSession("You are a helpful assistant.");
        const stream = sendMessageStream(chat, content);
        for await (const chunk of stream) {
          botText += chunk;
          setMessages(prev => {
            const list = [...(prev[activeRoomId]||[])];
            const idx = list.findIndex(m => m.id === botMsgId);
            if(idx!==-1) list[idx] = {...list[idx], content: botText};
            return {...prev, [activeRoomId]: list};
          });
        }
      } catch(e) { console.error(e); }
      setIsTyping(false);
      setMessages(prev => {
         const list = [...(prev[activeRoomId]||[])];
         const idx = list.findIndex(m => m.id === botMsgId);
         if(idx!==-1) list[idx].isStreaming = false;
         return {...prev, [activeRoomId]: list};
      });
    }
  };

  if(!user) return <Auth onAuthSuccess={setUser} />;

  return (
    <div className={"flex h-screen w-full " + (user.preferences?.theme==='dark'?'bg-slate-900 text-white':'bg-white text-slate-800')}>
      {activeCall && <CallScreen room={rooms.find(r=>r.id===activeCall.roomId)} type={activeCall.type} onEnd={()=>setActiveCall(null)} />}
      <div className={"w-full md:w-[400px] border-r " + (activeRoomId ? 'hidden md:flex' : 'flex')}>
        <Sidebar 
          rooms={rooms} 
          activeRoomId={activeRoomId} 
          onSelectRoom={(r) => { 
             if(!rooms.find(ex=>ex.id===r.id)) setRooms(p=>[...p, r]); 
             setActiveRoomId(r.id); 
          }} 
          user={user}
          onLogout={()=>setUser(null)}
          callHistory={[]}
          activeCall={activeCall}
          lastMessages={{}}
          onUpdateUser={setUser}
        />
      </div>
      <div className={"flex-1 " + (activeRoomId ? 'flex' : 'hidden md:flex')}>
        {activeRoomId ? (
          <ChatWindow 
             room={rooms.find(r=>r.id===activeRoomId)} 
             messages={messages[activeRoomId]||[]} 
             onSendMessage={handleSend} 
             onBack={()=>setActiveRoomId(null)}
             user={user}
             isTyping={isTyping}
             onSetGlobalCallState={setActiveCall}
          />
        ) : <DashboardHome />}
      </div>
    </div>
  );
}`,
  'components/Auth.tsx': `import React, { useState } from 'react';
import { storage } from '../services/storageService';
export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({email:'', password:'', name:'', phone:''});
  const handleSubmit = (e) => {
    e.preventDefault();
    if(isLogin) {
      const u = storage.verifyAccount(form.email, form.password);
      if(u) onAuthSuccess(u); else alert("Invalid credentials");
    } else {
      const u = {...form, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed='+form.name, gender:'male', preferences:{theme:'light'}};
      if(storage.registerAccount(u)) onAuthSuccess(u); else alert("Email exists");
    }
  };
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center text-indigo-600">Gop Sop</h1>
        {!isLogin && <>
          <input placeholder="Name" className="w-full p-3 border rounded" required onChange={e=>setForm({...form, name:e.target.value})} />
          <input placeholder="Phone (User ID)" className="w-full p-3 border rounded" required onChange={e=>setForm({...form, phone:e.target.value})} />
        </>}
        <input type="email" placeholder="Email" className="w-full p-3 border rounded" required onChange={e=>setForm({...form, email:e.target.value})} />
        <input type="password" placeholder="Password" className="w-full p-3 border rounded" required onChange={e=>setForm({...form, password:e.target.value})} />
        <button className="w-full bg-indigo-600 text-white p-3 rounded font-bold">{isLogin?'Login':'Register'}</button>
        <p onClick={()=>setIsLogin(!isLogin)} className="text-center text-sm text-indigo-500 cursor-pointer">{isLogin?'Create Account':'Login'}</p>
      </form>
    </div>
  );
}`,
  'components/Sidebar.tsx': `import React, { useState } from 'react';
import { RealtimeService } from '../services/realtimeService';
export default function Sidebar({ rooms, onSelectRoom, user, onLogout, onUpdateUser }) {
  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');
  return (
    <div className="h-full flex flex-col bg-white border-r">
      <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white">
        <div className="flex items-center gap-2"><img src={user.avatar} className="w-8 h-8 rounded-full bg-white" /> <span className="font-bold">{user.name}</span></div>
        <button onClick={onLogout} className="text-xs bg-red-500 px-2 py-1 rounded">Logout</button>
      </div>
      <div className="flex border-b">
        {['chats','random','settings'].map(t => <button key={t} onClick={()=>setTab(t)} className={"flex-1 p-3 capitalize font-bold "+(tab===t?'text-indigo-600 border-b-2 border-indigo-600':'text-gray-500')}>{t}</button>)}
      </div>
      <div className="flex-1 overflow-auto">
        {tab==='chats' && rooms.map(r => (
           <div key={r.id} onClick={()=>onSelectRoom(r)} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b">
             <img src={r.avatar} className="w-12 h-12 rounded-full" />
             <div className="ml-3"><p className="font-bold text-gray-800">{r.name}</p><p className="text-xs text-gray-500">{r.persona}</p></div>
           </div>
        ))}
        {tab==='random' && <div className="p-8 text-center"><button onClick={()=>{
           RealtimeService.findRandomPartner(user.phoneNumber, user.name, user.gender, (partner) => onSelectRoom(partner));
        }} className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg">Find Random Partner</button></div>}
        {tab==='settings' && <div className="p-4"><button onClick={()=>onUpdateUser({...user, preferences:{...user.preferences, theme:user.preferences?.theme==='dark'?'light':'dark'}})} className="w-full p-3 border rounded mb-2">Toggle Theme</button></div>}
      </div>
    </div>
  );
}`,
  'components/ChatWindow.tsx': `import React, { useRef, useEffect } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
export default function ChatWindow({ room, messages, onSendMessage, onBack, user, isTyping, onSetGlobalCallState }) {
  const scrollRef = useRef(null);
  useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);
  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
      <div className="p-3 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
           <button onClick={onBack} className="md:hidden">←</button>
           <img src={room.avatar} className="w-10 h-10 rounded-full" />
           <div><p className="font-bold">{room.name}</p><p className="text-xs text-green-500">Online</p></div>
        </div>
        <div className="flex gap-4 text-indigo-600">
           <button onClick={()=>onSetGlobalCallState({roomId:room.id, type:'audio'})}>📞</button>
           <button onClick={()=>onSetGlobalCallState({roomId:room.id, type:'video'})}>🎥</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4" ref={scrollRef}>
         {messages.map(m => <ChatMessage key={m.id} message={m} myPhone={user.phoneNumber} />)}
         {isTyping && <div className="text-xs text-gray-500 italic ml-12">Typing...</div>}
      </div>
      <div className="p-2 bg-white"><ChatInput onSend={onSendMessage} /></div>
    </div>
  );
}`,
  'components/ChatMessage.tsx': `import React from 'react';
export default function ChatMessage({ message, myPhone }) {
  const isMe = message.role === 'user';
  return (
    <div className={"flex w-full " + (isMe ? 'justify-end' : 'justify-start')}>
      <div className={"max-w-[70%] p-3 rounded-lg shadow-sm " + (isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none')}>
        {message.type==='image' ? <img src={message.content} className="rounded-lg max-w-full" /> : <p>{message.content}</p>}
        <p className="text-[10px] opacity-70 text-right mt-1">{new Date(message.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
      </div>
    </div>
  );
}`,
  'components/ChatInput.tsx': `import React, { useState } from 'react';
export default function ChatInput({ onSend }) {
  const [text, setText] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input className="flex-1 p-3 border rounded-full bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&text.trim()){onSend(text);setText('')}}} placeholder="Type a message..." />
      <button onClick={()=>{if(text.trim()){onSend(text);setText('')}}} className="p-3 bg-indigo-600 text-white rounded-full">➤</button>
    </div>
  );
}`,
  'components/DashboardHome.tsx': `import React from 'react';
export default function DashboardHome() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
      <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mb-6 text-4xl">💬</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Gop Sop Web</h1>
      <p className="text-gray-500 max-w-md">Send and receive messages without keeping your phone online.<br/>Use Gop Sop on up to 4 linked devices and 1 phone.</p>
    </div>
  );
}`,
  'components/CallScreen.tsx': `import React, { useEffect, useRef, useState } from 'react';
export default function CallScreen({ room, type, onEnd }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: type==='video', audio: true }).then(s => { setStream(s); if(videoRef.current) videoRef.current.srcObject = s; });
    return () => stream?.getTracks().forEach(t=>t.stop());
  }, []);
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
      {type==='video' && <video ref={videoRef} autoPlay muted className="absolute inset-0 w-full h-full object-cover opacity-50" />}
      <img src={room.avatar} className="w-32 h-32 rounded-full border-4 border-white mb-4 z-10" />
      <h2 className="text-2xl font-bold z-10">{room.name}</h2>
      <p className="mb-8 z-10 animate-pulse">Calling...</p>
      <button onClick={onEnd} className="bg-red-500 p-4 rounded-full z-10 shadow-xl">End Call</button>
    </div>
  );
}`
};

Object.keys(files).forEach(fileName => {
  const content = files[fileName];
  const dir = path.dirname(fileName);
  if (dir !== '.') {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fileName, content);
  console.log('Created:', fileName);
});

console.log('✅ Setup Complete! Run "npm install" then "npm run dev"');
