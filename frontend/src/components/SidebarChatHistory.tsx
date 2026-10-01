import { useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { Plus, Clock, Edit2, Trash2, Check, X } from 'lucide-react';

function formatLastConsulted(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Hier à ${timeStr}`;
  }
  
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

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
          className="w-full flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl border border-border bg-background hover:bg-secondary text-foreground transition-all text-sm font-semibold shadow-sm"
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
            className={`group flex items-center justify-between px-3 min-h-[44px] py-1.5 rounded-xl cursor-pointer transition-all text-xs ${
              c.id === activeId
                ? 'bg-secondary text-foreground font-medium shadow-sm border border-border'
                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0 py-0.5">
              <Clock size={14} className={`mt-0.5 shrink-0 ${c.id === activeId ? 'text-primary' : 'opacity-60'}`} />
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
                    className="flex-1 bg-background text-foreground border border-border rounded px-2 min-h-[36px] text-xs focus:outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                  <button onClick={() => saveRename(c.id)} className="text-green-500 min-h-[36px] min-w-[36px] flex items-center justify-center"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-w-0 leading-tight">
                  <span className="truncate font-semibold text-foreground">{c.title}</span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                    {formatLastConsulted(c.updatedAt || c.createdAt)}
                  </span>
                </div>
              )}
            </div>

            {c.id === activeId && editingId !== c.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                <button onClick={(e) => startRename(c, e)} className="w-8 h-8 flex items-center justify-center hover:bg-black/10 rounded transition-colors text-muted-foreground hover:text-foreground" title="Renommer">
                  <Edit2 size={13} />
                </button>
                <button onClick={(e) => deleteConversation(c.id, e)} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 text-red-500 rounded transition-colors" title="Supprimer">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
