import { useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { Plus, Clock, Edit2, Trash2, Check, X } from 'lucide-react';

export default function SidebarChatHistory() {
  const { conversations, activeId, setActiveId, addConversation, deleteConversation, updateConversation } = useChat();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (c: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      updateConversation(id, c => ({ ...c, title: editTitle.trim() }));
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <button
          onClick={addConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary/80 text-foreground transition-all text-sm font-medium"
        >
          <Plus size={16} />
          Nouveau Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {conversations.map(c => (
          <div
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
              c.id === activeId
                ? 'bg-secondary text-foreground font-medium shadow-sm'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Clock size={14} className={c.id === activeId ? 'opacity-100' : 'opacity-60'} />
              {editingId === c.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveRename(c.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-background text-foreground border border-border rounded px-1 text-xs focus:outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                  <button onClick={() => saveRename(c.id)} className="text-green-500"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500"><X size={14} /></button>
                </div>
              ) : (
                <span className="truncate">{c.title}</span>
              )}
            </div>

            {c.id === activeId && editingId !== c.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                <button onClick={(e) => startRename(c, e)} className="p-1 hover:bg-black/10 rounded transition-colors text-muted-foreground hover:text-foreground" title="Renommer">
                  <Edit2 size={12} />
                </button>
                <button onClick={(e) => deleteConversation(c.id, e)} className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Supprimer">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
