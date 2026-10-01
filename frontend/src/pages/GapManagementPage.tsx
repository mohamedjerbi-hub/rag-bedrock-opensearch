import { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Search, 
  CheckCircle2, 
  XCircle,
  UserCheck, 
  MessageSquare, 
  ChevronRight, 
  X, 
  Send, 
  Trash2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { getErrorMessage } from '../lib/utils';

export interface GapItem {
  id: string;
  ticket_number: string;
  user_id: string;
  user_email: string;
  user_name: string;
  conversation_id: string;
  question: string;
  generated_answer: string;
  retrieved_sources: Array<{ doc_name: string; chunk: string; score: number }>;
  issue_type: string;
  priority: string;
  user_comment: string;
  expected_answer?: string;
  notify_user: boolean;
  status: string;
  assigned_to?: string;
  resolution_note?: string;
  resolved_at?: string;
  resolved_by?: string;
  linked_doc_id?: string;
  created_at: string;
  updated_at: string;
}

export default function GapManagementPage() {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Selected gap for detail drawer
  const [activeGap, setActiveGap] = useState<GapItem | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [statusInput, setStatusInput] = useState('');

  useEffect(() => {
    fetchGaps();
    fetchStats();
  }, [selectedStatus, selectedPriority, selectedType, unassignedOnly, search]);

  const fetchGaps = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedPriority !== 'all') params.priority = selectedPriority;
      if (selectedType !== 'all') params.issue_type = selectedType;
      if (unassignedOnly) params.unassigned = 'true';
      if (search.trim()) params.search = search.trim();

      const res = await api.getKnowledgeGaps(params);
      setGaps(res.items || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors du chargement des signalements.'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getGapStats();
      setStats(data);
    } catch (_) {}
  };

  const openDetailDrawer = async (gap: GapItem) => {
    setActiveGap(gap);
    setStatusInput(gap.status);
    setAssignedTo(gap.assigned_to || '');
    setResolutionNote(gap.resolution_note || '');

    try {
      const res = await api.getKnowledgeGapById(gap.id);
      setComments(res.comments || []);
    } catch (_) {
      setComments([]);
    }
  };

  const handleUpdateStatus = async () => {
    if (!activeGap) return;
    try {
      const res = await api.updateKnowledgeGap(activeGap.id, {
        status: statusInput,
        assigned_to: assignedTo.trim() || undefined,
        resolution_note: resolutionNote.trim() || undefined,
      });

      toast.success(`Ticket ${activeGap.ticket_number} mis à jour (${statusInput})`);
      setActiveGap(res.gap);
      fetchGaps();
      fetchStats();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de la mise à jour.'));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGap || !newComment.trim()) return;

    try {
      const res = await api.addGapComment(activeGap.id, newComment.trim());
      setComments(prev => [...prev, res.comment]);
      setNewComment('');
      toast.success('Commentaire interne ajouté.');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de l\'ajout du commentaire.'));
    }
  };

  const handleDeleteGap = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce signalement ?')) return;
    try {
      await api.deleteKnowledgeGap(id);
      toast.success('Signalement supprimé.');
      if (activeGap?.id === id) setActiveGap(null);
      fetchGaps();
      fetchStats();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Seul un administrateur peut supprimer un signalement.'));
    }
  };

  // Helper for type labels
  const typeLabels: Record<string, string> = {
    information_absente: 'Information absente',
    reponse_incorrecte: 'Réponse incorrecte',
    document_obsolete: 'Document obsolète',
    reponse_imprecise: 'Réponse imprécise',
    mauvais_document_cite: 'Mauvais document cité',
  };

  const statusLabels: Record<string, string> = {
    nouveau: 'Nouveau',
    en_cours: 'En cours',
    resolu: 'Corrigé',
    rejete: 'Ignoré / Rejeté',
    doublon: 'Doublon',
  };

  const priorityColors: Record<string, string> = {
    basse: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    normale: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    haute: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    bloquante: 'bg-red-500/10 text-red-600 border-red-500/20 font-bold',
  };

  const statusColors: Record<string, string> = {
    nouveau: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    en_cours: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    resolu: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold',
    rejete: 'bg-red-500/10 text-red-600 border-red-500/20 font-semibold',
    doublon: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <AlertCircle size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion des Signalements & Lacunes</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Portail éditorial pour analyser, prioriser et combler les manques documentaires de l'entreprise.
          </p>
        </div>

        <button
          onClick={() => { fetchGaps(); fetchStats(); }}
          className="self-start sm:self-auto px-4 min-h-[44px] rounded-xl bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {/* Stats KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Tickets Nouveaux</p>
            <p className="text-2xl font-bold text-purple-600">{stats.byStatus?.nouveau || 0}</p>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium">En cours de traitement</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byStatus?.en_cours || 0}</p>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Tickets Résolus</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.byStatus?.resolu || 0}</p>
          </div>
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Délai Moyen de Résolution</p>
            <p className="text-2xl font-bold text-primary">{stats.avgResolutionHours || 0} h</p>
          </div>
        </div>
      )}

      {/* Top Missing Topics Intelligent Grouping Banner */}
      {stats?.topMissingTopics && stats.topMissingTopics.length > 0 && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={16} />
            <span>Regroupement Intelligent — Top Sujets Manquants (Questions Similaires)</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {stats.topMissingTopics.slice(0, 4).map((topic: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-foreground truncate">{topic.primary_question}</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold font-mono text-[11px]">
                  {topic.similar_count} demandeur{topic.similar_count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par ticket #GAP-, question, commentaire ou utilisateur..."
              className="w-full pl-10 pr-4 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-primary"
            >
              <option value="all">Tous statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="resolu">Résolu</option>
              <option value="rejete">Rejeté</option>
              <option value="doublon">Doublon</option>
            </select>

            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="px-3 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-primary"
            >
              <option value="all">Toutes priorités</option>
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="bloquante">Bloquante</option>
            </select>

            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-3 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground text-xs font-medium focus:outline-none focus:border-primary"
            >
              <option value="all">Toutes natures</option>
              <option value="information_absente">Information absente</option>
              <option value="reponse_incorrecte">Réponse incorrecte</option>
              <option value="document_obsolete">Document obsolète</option>
              <option value="reponse_imprecise">Réponse imprécise</option>
              <option value="mauvais_document_cite">Mauvais document cité</option>
            </select>

            <label className="flex items-center gap-2 px-3.5 min-h-[44px] rounded-xl bg-secondary/30 border border-border cursor-pointer select-none text-xs text-foreground font-medium">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={e => setUnassignedOnly(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-border"
              />
              <span>Non assignés</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5">Ticket</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Demandeur</th>
                <th className="p-3.5">Question Posée</th>
                <th className="p-3.5">Nature</th>
                <th className="p-3.5">Priorité</th>
                <th className="p-3.5">Statut</th>
                <th className="p-3.5">Assigné à</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Chargement des signalements...
                  </td>
                </tr>
              ) : gaps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Aucun signalement ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                gaps.map(gap => (
                  <tr
                    key={gap.id}
                    onClick={() => openDetailDrawer(gap)}
                    className="hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono font-bold text-primary">{gap.ticket_number}</td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {new Date(gap.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">{gap.user_name}</td>
                    <td className="p-3.5 font-medium text-foreground max-w-xs truncate">{gap.question}</td>
                    <td className="p-3.5 text-muted-foreground">{typeLabels[gap.issue_type] || gap.issue_type}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${priorityColors[gap.priority]}`}>
                        {gap.priority}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[gap.status]}`}>
                        {statusLabels[gap.status] || gap.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                      {gap.resolved_by ? (
                        <span className="text-emerald-600 font-bold">✓ {gap.resolved_by}</span>
                      ) : gap.assigned_to ? (
                        <span>{gap.assigned_to}</span>
                      ) : (
                        <span className="italic text-muted-foreground/60">Non assigné</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openDetailDrawer(gap)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL DRAWER / MODAL */}
      {activeGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card text-card-foreground border-l border-border h-full max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-lg text-primary">{activeGap.ticket_number}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[activeGap.status]}`}>
                  {activeGap.status}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityColors[activeGap.priority]}`}>
                  {activeGap.priority}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteGap(activeGap.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Supprimer (Admin uniquement)"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setActiveGap(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Question & Requester */}
              <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Demandeur: {activeGap.user_name} ({activeGap.user_email})</span>
                  <span>Date: {new Date(activeGap.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <h3 className="font-bold text-sm text-foreground leading-snug">
                  "{activeGap.question}"
                </h3>
              </div>

              {/* BILAN DU TRAITEMENT & SOLUTION (Corrigé ou Ignoré/Rejeté) */}
              {(activeGap.status === 'resolu' || activeGap.status === 'rejete' || activeGap.resolution_note) && (
                <div className={`p-4 rounded-2xl border ${
                  activeGap.status === 'resolu' 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100' 
                    : activeGap.status === 'rejete'
                    ? 'border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100'
                    : 'border-border bg-secondary/30 text-foreground'
                } space-y-2.5 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs">
                      {activeGap.status === 'resolu' ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 size={16} /> Signalement Corrigé / Résolu</span>
                      ) : activeGap.status === 'rejete' ? (
                        <span className="text-red-600 font-bold flex items-center gap-1.5"><XCircle size={16} /> Signalement Ignoré / Rejeté</span>
                      ) : (
                        <span className="text-primary font-bold flex items-center gap-1.5"><AlertCircle size={16} /> En cours de traitement</span>
                      )}
                    </div>
                    {activeGap.resolved_at && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(activeGap.resolved_at).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1.5 pt-1">
                    <p>
                      <strong className="text-foreground">Traité / Corrigé par :</strong>{' '}
                      <span className="font-mono text-primary font-bold">{activeGap.resolved_by || activeGap.assigned_to || 'Éditeur responsable'}</span>
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-foreground">Solution / Explication :</strong>{' '}
                      <span className="italic">{activeGap.resolution_note || 'Aucune note d\'explication fournie.'}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* User Comment & Expected Answer */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-border bg-card space-y-1">
                  <p className="font-bold text-foreground">Commentaire du demandeur :</p>
                  <p className="text-muted-foreground leading-relaxed italic">"{activeGap.user_comment}"</p>
                </div>

                {activeGap.expected_answer && (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
                    <p className="font-bold text-primary">Réponse attendue indiquée :</p>
                    <p className="text-muted-foreground leading-relaxed">"{activeGap.expected_answer}"</p>
                  </div>
                )}
              </div>

              {/* Generated Answer Preview */}
              {activeGap.generated_answer && (
                <div className="space-y-1.5">
                  <p className="font-bold text-foreground">Réponse IA générée :</p>
                  <div className="p-3 rounded-xl border border-border bg-secondary/20 text-muted-foreground font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto">
                    {activeGap.generated_answer}
                  </div>
                </div>
              )}

              {/* Retrieved Sources & Scores */}
              {activeGap.retrieved_sources && activeGap.retrieved_sources.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-foreground">Sources récupérées ({activeGap.retrieved_sources.length}) :</p>
                  <div className="space-y-2">
                    {activeGap.retrieved_sources.map((src, i) => (
                      <div key={i} className="p-3 rounded-xl border border-border bg-card space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-foreground">{src.doc_name}</span>
                          <span className="font-mono text-primary font-bold">{Math.round(src.score * 100)}% match</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{src.chunk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EDITORIAL MANAGEMENT PANEL */}
              <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
                <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                  <UserCheck size={16} /> Actions Éditoriales & Traitement
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Statut du ticket</label>
                    <select
                      value={statusInput}
                      onChange={e => setStatusInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none"
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="resolu">Résolu</option>
                      <option value="rejete">Rejeté</option>
                      <option value="doublon">Doublon</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Assigner à</label>
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                      placeholder="Email de l'éditeur"
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Note de résolution (transmise à l'utilisateur si coché)</label>
                  <textarea
                    rows={2}
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value)}
                    placeholder="Expliquez l'action réalisée (document téléversé, correction)..."
                    className="w-full p-2.5 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={15} /> Mettre à jour le ticket
                </button>
              </div>

              {/* INTERNAL DISCUSSION THREAD */}
              <div className="space-y-3 pt-3 border-t border-border">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <MessageSquare size={16} /> Fil de Discussion Interne ({comments.length})
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-muted-foreground italic text-center py-2">Aucun commentaire pour l'instant.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="p-3 rounded-xl border border-border bg-secondary/30 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                          <span className="font-bold text-foreground">{c.author_name}</span>
                          <span>{new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{c.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Ajouter une note interne..."
                    className="flex-1 px-3 py-2 rounded-xl bg-secondary/30 border border-border text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl transition-colors shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
