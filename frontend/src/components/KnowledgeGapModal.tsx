import React, { useState } from 'react';
import { X, AlertCircle, Send, ChevronDown, ChevronUp, FileText, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { getErrorMessage } from '../lib/utils';

export type KnowledgeGapIssueType = 
  | 'information_absente'
  | 'reponse_incorrecte'
  | 'document_obsolete'
  | 'reponse_imprecise'
  | 'mauvais_document_cite';

export type KnowledgeGapPriority = 'basse' | 'normale' | 'haute' | 'bloquante';

interface KnowledgeGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
  initialAnswer?: string;
  initialSources?: Array<{ doc_name: string; chunk: string; score: number }>;
  conversationId?: string;
  onSubmitted?: (ticketNumber: string) => void;
}

export default function KnowledgeGapModal({
  isOpen,
  onClose,
  initialQuestion = '',
  initialAnswer = '',
  initialSources = [],
  conversationId = 'default',
  onSubmitted,
}: KnowledgeGapModalProps) {
  const [question, setQuestion] = useState(initialQuestion);
  const [issueType, setIssueType] = useState<KnowledgeGapIssueType>('information_absente');
  const [priority, setPriority] = useState<KnowledgeGapPriority>('normale');
  const [userComment, setUserComment] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [showAnswerPreview, setShowAnswerPreview] = useState(false);
  const [showSourcesPreview, setShowSourcesPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!question.trim() || question.trim().length < 3) {
      setError('La question doit contenir au moins 3 caractères.');
      return;
    }

    if (!userComment.trim()) {
      setError('Le commentaire explicatif est obligatoire.');
      return;
    }

    if (issueType === 'reponse_incorrecte' && userComment.trim().length < 5) {
      setError('Veuillez fournir un commentaire d\'au moins 5 caractères pour expliquer pourquoi la réponse est incorrecte.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.createKnowledgeGap({
        question: question.trim(),
        generated_answer: initialAnswer,
        retrieved_sources: initialSources,
        issue_type: issueType,
        priority: priority,
        user_comment: userComment.trim(),
        expected_answer: expectedAnswer.trim() || undefined,
        notify_user: notifyUser,
        conversation_id: conversationId,
      });

      toast.success(`Signalement créé : Ticket ${res.ticket_number}`, { duration: 5000 });
      if (onSubmitted) onSubmitted(res.ticket_number);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de l\'envoi du signalement.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold">
              <AlertCircle size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Signaler une Lacune Documentaire</h2>
              <p className="text-[11px] text-muted-foreground">Aidez l'équipe éditoriale à enrichir la base de connaissances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error font-medium text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Question (Editable) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>Question posée</span>
              <span className="text-[10px] text-muted-foreground font-normal">Pré-remplie, modifiable</span>
            </label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-secondary/30 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
              placeholder="Ex: Quelle est la procédure de remboursement..."
            />
          </div>

          {/* Collapsible Answer Preview */}
          {initialAnswer && (
            <div className="rounded-xl border border-border/80 bg-secondary/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAnswerPreview(!showAnswerPreview)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-muted-foreground hover:text-foreground font-medium text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle size={14} /> Voir la réponse obtenue (lecture seule)
                </span>
                {showAnswerPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showAnswerPreview && (
                <div className="p-3 border-t border-border bg-background/50 text-[11px] text-muted-foreground italic max-h-32 overflow-y-auto leading-relaxed">
                  "{initialAnswer}"
                </div>
              )}
            </div>
          )}

          {/* Collapsible Sources Preview */}
          {initialSources && initialSources.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-secondary/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSourcesPreview(!showSourcesPreview)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-muted-foreground hover:text-foreground font-medium text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={14} /> Sources récupérées ({initialSources.length})
                </span>
                {showSourcesPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showSourcesPreview && (
                <div className="p-3 border-t border-border bg-background/50 space-y-1.5 max-h-32 overflow-y-auto">
                  {initialSources.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground truncate">{s.doc_name}</span>
                      <span className="font-mono text-xs text-primary font-bold">{Math.round(s.score * 100)}% match</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Issue Type & Priority Selects */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nature du problème *</label>
              <select
                value={issueType}
                onChange={e => setIssueType(e.target.value as KnowledgeGapIssueType)}
                className="w-full px-3 py-2 rounded-xl bg-secondary/30 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="information_absente">Information absente</option>
                <option value="reponse_incorrecte">Réponse incorrecte</option>
                <option value="document_obsolete">Document obsolète</option>
                <option value="reponse_imprecise">Réponse imprécise</option>
                <option value="mauvais_document_cite">Mauvais document cité</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Priorité *</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as KnowledgeGapPriority)}
                className="w-full px-3 py-2 rounded-xl bg-secondary/30 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="bloquante">Bloquante</option>
              </select>
            </div>
          </div>

          {/* Free Comment */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>Commentaire explicatif *</span>
              <span className="text-[10px] text-muted-foreground">{userComment.length}/1000</span>
            </label>
            <textarea
              maxLength={1000}
              rows={3}
              value={userComment}
              onChange={e => setUserComment(e.target.value)}
              placeholder="Décrivez ce qui manque ou l'erreur constatée..."
              className="w-full p-3 rounded-xl bg-secondary/30 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Optional Expected Answer */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Quelle réponse attendiez-vous ? (optionnel)</label>
            <textarea
              maxLength={1000}
              rows={2}
              value={expectedAnswer}
              onChange={e => setExpectedAnswer(e.target.value)}
              placeholder="Si vous connaissez l'information exacte ou le bon document..."
              className="w-full p-3 rounded-xl bg-secondary/30 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Checkbox Notify User */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={notifyUser}
              onChange={e => setNotifyUser(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-secondary"
            />
            <span className="text-xs text-foreground font-medium">Me notifier lorsque l'équipe aura traité et résolu ce ticket</span>
          </label>

          {/* Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Envoi...</span>
              ) : (
                <>
                  <Send size={14} /> Envoyer le signalement
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
