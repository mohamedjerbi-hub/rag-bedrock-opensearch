import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Copy, Check, FileText, X, Square, Eye, ThumbsUp, ThumbsDown, RefreshCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, Source } from '../api/client';
import toast from 'react-hot-toast';
import { useChat, Message } from '../contexts/ChatContext';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

export default function ChatPage() {
  const { activeId, active, updateConversation } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  
  // Source detail drawer
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [active?.messages, streamingId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Texte copié dans le presse-papier');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbackState(prev => ({ ...prev, [id]: prev[id] === type ? undefined as any : type }));
    toast.success(type === 'up' ? 'Merci pour votre retour positif !' : 'Merci, nous améliorerons cette réponse.');
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingId(null);
    }
  };

  const handleRegenerate = async (lastUserMessage: string) => {
    if (!lastUserMessage || isLoading) return;
    setInput(lastUserMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    updateConversation(activeId, c => ({
      ...c,
      title: c.title === 'Nouvelle conversation' ? question.substring(0, 40) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));

    setInput('');
    setIsLoading(true);
    setStreamingId(assistantId);
    setSelectedSource(null);

    abortControllerRef.current = new AbortController();

    try {
      const history = active.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      await api.stream(
        '/query',
        { question, top_k: 5, history },
        (text) => {
          updateConversation(activeId, c => ({
            ...c,
            messages: c.messages.map(m =>
              m.id === assistantId ? { ...m, content: m.content + text } : m
            ),
          }));
        },
        (payload) => {
          updateConversation(activeId, c => ({
            ...c,
            messages: c.messages.map(m =>
              m.id === assistantId
                ? { ...m, sources: payload.sources, latency_ms: payload.latency_ms, cached: payload.cached }
                : m
            ),
          }));
          setIsLoading(false);
          setStreamingId(null);
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Interrompu par l'utilisateur
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        toast.error(`Échec de la réponse : ${msg}`);
        updateConversation(activeId, c => ({
          ...c,
          messages: c.messages.map(m =>
            m.id === assistantId ? { ...m, content: `❌ Erreur : ${msg}` } : m
          ),
        }));
      }
      setIsLoading(false);
      setStreamingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      {/* Main Chat View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-semibold text-sm tracking-tight text-foreground">Assistant RAG MJ Studio</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              v2.4 Pro
            </span>
          </div>
        </header>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {(!active || active.messages.length === 0) && (
              <div className="flex flex-col items-center justify-center text-center py-16 space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles size={24} />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Assistant Documentaire Intelligente</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Posez une question sur les documents internes. Les réponses sont générées avec citations précises et vérifiables.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full pt-4">
                  {[
                    'Qui contacter pour un problème IT ?',
                    'Quelle est notre politique RH et congés ?',
                    'Comment soumettre une note de frais ?',
                    'Quelles sont les consignes de sécurité IT ?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-left p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active?.messages.map((msg, index) => {
              const contentWithCitations = msg.content.replace(/\[(\d+)\]/g, '[$1](#cite-$1)');
              const isStreaming = msg.id === streamingId;
              const lastUserMsg = active.messages[index - 1]?.role === 'user' ? active.messages[index - 1].content : '';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} />
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-secondary border border-border text-foreground font-medium rounded-br-none'
                        : 'bg-card border border-border text-foreground shadow-sm rounded-bl-none'
                    }`}>
                      {msg.role === 'assistant' && isStreaming && msg.content === '' ? (
                        <div className="flex items-center gap-2.5 text-muted-foreground py-1">
                          <Loader2 size={15} className="animate-spin text-primary" />
                          <span className="text-xs font-medium">Recherche et synthèse en cours…</span>
                        </div>
                      ) : (
                        <div className={`prose prose-sm dark:prose-invert max-w-none ${isStreaming ? 'blinking-cursor' : ''}`}>
                          <ReactMarkdown
                            components={{
                              a: ({ node, ...props }) => {
                                if (props.href?.startsWith('#cite-')) {
                                  const idx = parseInt(props.href.replace('#cite-', '')) - 1;
                                  const source = msg.sources?.[idx];
                                  if (!source) return <span>[{idx + 1}]</span>;
                                  
                                  return (
                                    <button 
                                      onClick={() => setSelectedSource(source)} 
                                      className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded mx-0.5 align-text-top transition-colors ${
                                        selectedSource?.document_id === source.document_id 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground'
                                      }`}
                                      title={source.document_name}
                                    >
                                      {idx + 1}
                                    </button>
                                  );
                                }
                                return <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />;
                              }
                            }}
                          >
                            {contentWithCitations}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions for Assistant Message */}
                    {msg.role === 'assistant' && msg.content && !isStreaming && (
                      <div className="flex flex-col gap-2.5 w-full pt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="p-1 hover:text-foreground transition-colors rounded"
                              title="Copier"
                            >
                              {copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                            {lastUserMsg && (
                              <button
                                onClick={() => handleRegenerate(lastUserMsg)}
                                className="p-1 hover:text-foreground transition-colors rounded"
                                title="Régénérer"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                            <div className="h-3 w-[1px] bg-border mx-1" />
                            <button
                              onClick={() => handleFeedback(msg.id, 'up')}
                              className={`p-1 transition-colors rounded ${feedbackState[msg.id] === 'up' ? 'text-primary' : 'hover:text-foreground'}`}
                              title="Bonne réponse"
                            >
                              <ThumbsUp size={14} />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'down')}
                              className={`p-1 transition-colors rounded ${feedbackState[msg.id] === 'down' ? 'text-red-500' : 'hover:text-foreground'}`}
                              title="Réponse imprécise"
                            >
                              <ThumbsDown size={14} />
                            </button>
                          </div>

                          {msg.cached ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                              ⚡ Cache ({msg.latency_ms}ms)
                            </span>
                          ) : msg.latency_ms ? (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ⚡ {msg.latency_ms}ms
                            </span>
                          ) : null}
                        </div>

                        {/* Source Chips */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                            {msg.sources.map((src, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedSource(src)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                                  selectedSource?.document_name === src.document_name
                                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                                    : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <FileText size={12} />
                                <span className="truncate max-w-[160px]">{src.document_name}</span>
                                <span className="text-[10px] font-mono font-bold opacity-70">[{i + 1}]</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-secondary border border-border text-foreground flex items-center justify-center shrink-0 mt-1">
                      <User size={14} />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Stop Generating Floating Action */}
        {isLoading && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
            <button 
              onClick={stopGenerating}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-background border border-border text-foreground text-xs font-semibold rounded-full shadow-md hover:bg-secondary transition-all"
            >
              <Square size={12} fill="currentColor" /> Interrompre la génération
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="px-4 md:px-8 py-4 bg-background border-t border-border shrink-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-secondary/30 border border-border rounded-xl px-4 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question sur vos documents d'entreprise…"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed max-h-[160px] overflow-y-auto disabled:opacity-50 py-1"
                style={{ minHeight: '26px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm ml-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-2 font-mono">
              Propulsé par MJ Studio RAG Engine · Soutenance ENI Carthage 2026
            </p>
          </form>
        </div>

        <DocumentViewerModal
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      </div>

      {/* Right Drawer - Source Citation Details */}
      {selectedSource && (
        <div className="w-80 border-l border-border bg-background flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between shrink-0 bg-secondary/20">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
              <FileText size={14} className="text-primary" /> Source Citée
            </h3>
            <button 
              onClick={() => setSelectedSource(null)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Fichier Source</p>
              <p className="font-bold text-foreground break-words text-sm">{selectedSource.document_name}</p>
              {selectedSource.page ? (
                <span className="inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  Page / Section {selectedSource.page}
                </span>
              ) : null}
            </div>
            
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5">Score de Pertinence</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ width: `${Math.round(selectedSource.score * 100)}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-foreground">{Math.round(selectedSource.score * 100)}%</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Extrait Exact Retenu</p>
              <div className="bg-secondary/40 border border-border rounded-xl p-3.5 leading-relaxed text-foreground italic shadow-inner">
                "{selectedSource.excerpt}"
              </div>
            </div>
            
            <div className="pt-3">
              <button 
                className="w-full py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5"
                onClick={() => setSelectedDocumentId(selectedSource.document_id)}
              >
                <Eye size={13} /> Lire le document complet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
