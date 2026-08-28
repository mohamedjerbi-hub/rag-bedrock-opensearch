import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Source } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  latency_ms?: number;
  cached?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string; // Last consulted/updated timestamp
}

export function newConversation(): Conversation {
  const now = new Date().toISOString();
  return { 
    id: crypto.randomUUID(), 
    title: 'Nouvelle conversation', 
    messages: [], 
    createdAt: now,
    updatedAt: now,
  };
}

interface ChatContextType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  activeId: string;
  setActiveId: (id: string) => void;
  active: Conversation | undefined;
  addConversation: () => void;
  deleteConversation: (id: string, e?: React.MouseEvent) => void;
  updateConversation: (id: string, updater: (c: Conversation) => Conversation) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userEmail = user?.email || 'guest';
  const storageKey = `rag_conversations_${userEmail.toLowerCase()}`;

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [newConversation()];
  });

  const [activeId, setActiveIdState] = useState<string>(conversations[0]?.id || '');

  // Switch conversation list when user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveIdState(parsed[0].id);
          return;
        }
      }
    } catch (e) {}

    const fresh = [newConversation()];
    setConversations(fresh);
    setActiveIdState(fresh[0].id);
  }, [storageKey]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(conversations));
  }, [conversations, storageKey]);

  const active = conversations.find(c => c.id === activeId) || conversations[0];

  const setActiveId = (id: string) => {
    setActiveIdState(id);
    // Touch last consulted date
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, updatedAt: new Date().toISOString() } : c
    ));
  };

  const addConversation = () => {
    const c = newConversation();
    setConversations(prev => [c, ...prev]);
    setActiveIdState(c.id);
  };

  const deleteConversation = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const newC = newConversation();
        setActiveIdState(newC.id);
        return [newC];
      }
      if (id === activeId) {
        setActiveIdState(filtered[0].id);
      }
      return filtered;
    });
  };

  const updateConversation = (id: string, updater: (c: Conversation) => Conversation) => {
    const now = new Date().toISOString();
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...updater(c), updatedAt: now } : c
    ));
  };

  return (
    <ChatContext.Provider value={{
      conversations,
      setConversations,
      activeId,
      setActiveId,
      active,
      addConversation,
      deleteConversation,
      updateConversation
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
