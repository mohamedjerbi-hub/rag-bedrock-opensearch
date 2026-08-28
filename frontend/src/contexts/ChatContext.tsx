import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Source } from '../api/client';

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
}

export function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: 'Nouvelle conversation', messages: [], createdAt: new Date().toISOString() };
}

interface ChatContextType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  activeId: string;
  setActiveId: React.Dispatch<React.SetStateAction<string>>;
  active: Conversation | undefined;
  addConversation: () => void;
  deleteConversation: (id: string, e?: React.MouseEvent) => void;
  updateConversation: (id: string, updater: (c: Conversation) => Conversation) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('rag_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [newConversation()];
  });
  
  const [activeId, setActiveId] = useState<string>(conversations[0]?.id || '');

  useEffect(() => {
    localStorage.setItem('rag_conversations', JSON.stringify(conversations));
  }, [conversations]);

  const active = conversations.find(c => c.id === activeId) || conversations[0];

  const addConversation = () => {
    const c = newConversation();
    setConversations(prev => [c, ...prev]);
    setActiveId(c.id);
  };

  const deleteConversation = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const newC = newConversation();
        setActiveId(newC.id);
        return [newC];
      }
      if (id === activeId) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  };

  const updateConversation = (id: string, updater: (c: Conversation) => Conversation) => {
    setConversations(prev => prev.map(c => c.id === id ? updater(c) : c));
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
