import { useEffect, useState, useMemo } from 'react';
import { SkeletonTable } from '../components/Skeleton';
import { Activity, Zap, FileStack, Users, RefreshCw, CheckCircle2, AlertCircle, Shield, UserCheck, Search, ShieldCheck, User, Eye, Power, PieChart, BarChart3, Download, FileText } from 'lucide-react';
import { api, StatsData, UserRecord } from '../api/client';
import toast from 'react-hot-toast';

function RoleBadge({ role }: { role: UserRecord['role'] }) {
  const map = {
    admin: { label: 'Administrateur', cls: 'bg-primary/10 text-primary border-primary/20', icon: ShieldCheck },
    editor: { label: 'Éditeur', cls: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: UserCheck },
    auditor: { label: 'Auditeur', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Eye },
    reader: { label: 'Lecteur', cls: 'bg-muted text-muted-foreground border-border', icon: User },
  };
  const cfg = map[role] || map.reader;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <cfg.icon size={12} />
      {cfg.label}
    </span>
  );
}

// ─── Daily Traffic Bar Chart ──────────────────────────────────────────────────
function TrafficBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 700;
  const H = 160;
  const pad = { top: 10, right: 10, bottom: 36, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = Math.floor(chartW / Math.max(data.length, 1)) - 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Requêtes quotidiennes">
      <defs>
        <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Y axis gridlines */}
      {[0, 0.5, 1].map(ratio => {
        const y = pad.top + chartH * (1 - ratio);
        const val = Math.round(max * ratio);
        return (
          <g key={ratio}>
            <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="currentColor" strokeOpacity="0.08" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="currentColor" fillOpacity="0.5" fontSize="10">{val}</text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * chartH, d.count > 0 ? 4 : 0);
        const x = pad.left + i * (chartW / data.length) + 4;
        const y = pad.top + chartH - barH;
        const label = new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill="url(#bar-gradient)">
              <title>{d.date} : {d.count} requêtes</title>
            </rect>
            <text x={x + barW / 2} y={pad.top + chartH + 16} textAnchor="middle" fill="currentColor" fillOpacity="0.5" fontSize="10">
              {label}
            </text>
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">
                {d.count}
              </text>
            )}
          </g>
        );
      })}

      <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH} stroke="currentColor" strokeOpacity="0.15" />
    </svg>
  );
}

// ─── Format Donut Chart SVG ───────────────────────────────────────────────────
function FormatsDonutChart({ formats }: { formats: { pdf: number; docx: number; xlsx: number; text: number } }) {
  const total = (formats.pdf + formats.docx + formats.xlsx + formats.text) || 1;
  const pdfPct = Math.round((formats.pdf / total) * 100);
  const docxPct = Math.round((formats.docx / total) * 100);
  const xlsxPct = Math.round((formats.xlsx / total) * 100);
  const textPct = Math.round((formats.text / total) * 100);

  const items = [
    { label: 'PDF', val: formats.pdf, pct: pdfPct, color: 'text-red-500 bg-red-500' },
    { label: 'DOCX', val: formats.docx, pct: docxPct, color: 'text-blue-500 bg-blue-500' },
    { label: 'XLSX', val: formats.xlsx, pct: xlsxPct, color: 'text-emerald-500 bg-emerald-500' },
    { label: 'MD/TXT', val: formats.text, pct: textPct, color: 'text-purple-500 bg-purple-500' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" />
          {/* Slices */}
          {(() => {
            let offset = 0;
            return items.map((item, idx) => {
              const strokeDasharray = `${item.pct} ${100 - item.pct}`;
              const strokeDashoffset = -offset;
              offset += item.pct;
              const strokeColors = ['#ef4444', '#3b82f6', '#10b981', '#a855f7'];
              return (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke={strokeColors[idx]}
                  strokeWidth="3.5"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              );
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Docs</span>
        </div>
      </div>

      <div className="space-y-2 flex-1 w-full">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color.split(' ')[1]}`} />
              <span className="font-medium text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-muted-foreground">{item.val} fichier(s)</span>
              <span className="font-bold text-foreground">{item.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getUsers().catch(() => ({ users: [] })),
      api.get<StatsData>('/stats').catch(() => null),
    ])
      .then(([usersRes, statsRes]) => {
        setUsers(usersRes.users || []);
        if (statsRes) setStats(statsRes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (email: string, newRole: string) => {
    setUpdatingUser(email);
    try {
      await api.updateUserRole(email, newRole);
      toast.success(`Rôle de ${email} mis à jour : ${newRole}`);
      setUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole as any } : u));
    } catch (e: any) {
      toast.error(e.message || 'Erreur de modification de rôle');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleStatusToggle = async (email: string, currentActive: boolean) => {
    setUpdatingUser(email);
    const newActive = !currentActive;
    try {
      await api.updateUserStatus(email, newActive);
      toast.success(`Compte ${email} ${newActive ? 'réactivé' : 'suspendu'}`);
      setUsers(prev => prev.map(u => u.email === email ? { ...u, active: newActive } : u));
    } catch (e: any) {
      toast.error(e.message || 'Erreur de mise à jour du statut');
    } finally {
      setUpdatingUser(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search.trim() ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const counts = useMemo(() => {
    return {
      admin: users.filter(u => u.role === 'admin').length,
      editor: users.filter(u => u.role === 'editor').length,
      auditor: users.filter(u => u.role === 'auditor').length,
      reader: users.filter(u => u.role === 'reader').length,
      suspended: users.filter(u => !u.active).length,
    };
  }, [users]);

  const handleExportStatsCSV = () => {
    if (!stats) return;
    const rows = [
      ['Métrique', 'Valeur'],
      ['Documents Totaux', stats.documents],
      ['Chunks Vectorisés', stats.chunks],
      ['Requêtes (30j)', stats.queries_30d],
      ['Latence Moyenne (ms)', stats.avg_latency_ms],
      ['Taux de Succès (%)', `${stats.success_rate || 100}%`],
      ['Taux d\'Information Absente (%)', `${stats.unresolved_rate || 0}%`],
      ['', ''],
      ['Format Document', 'Nombre de Fichiers'],
      ['PDF', stats.document_formats?.pdf || 0],
      ['DOCX', stats.document_formats?.docx || 0],
      ['XLSX', stats.document_formats?.xlsx || 0],
      ['MD / TXT', stats.document_formats?.text || 0],
      ['', ''],
      ['Document Source', 'Nombre de Citations'],
      ...(stats.top_sources || []).map(s => [s.name, s.count]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_statistiques_smartdocs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 h-full overflow-y-auto">
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="text-primary" size={30} />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Console d'Administration & Analyse</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Gestion fine des utilisateurs (RBAC), contrôle d'accès et statistiques d'utilisation du système RAG.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'stats' && (
            <button
              onClick={handleExportStatsCSV}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-xl font-medium text-sm transition-colors"
            >
              <Download size={14} /> Exporter Rapport CSV
            </button>
          )}
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium text-sm transition-colors"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Users size={16} /> Annuaire des Utilisateurs & Rôles ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'stats' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <BarChart3 size={16} /> Statistiques & Analyse RAG
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0">
            <div className="p-4 rounded-2xl border border-border bg-background shadow-sm">
              <p className="text-xs text-muted-foreground font-medium mb-1">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
            </div>
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 shadow-sm">
              <p className="text-xs text-primary font-medium mb-1">Administrateurs</p>
              <p className="text-2xl font-bold text-primary">{counts.admin}</p>
            </div>
            <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-sm">
              <p className="text-xs text-purple-600 font-medium mb-1">Éditeurs</p>
              <p className="text-2xl font-bold text-purple-600">{counts.editor}</p>
            </div>
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
              <p className="text-xs text-amber-600 font-medium mb-1">Auditeurs</p>
              <p className="text-2xl font-bold text-amber-600">{counts.auditor}</p>
            </div>
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 shadow-sm">
              <p className="text-xs text-red-600 font-medium mb-1">Comptes Suspendus</p>
              <p className="text-2xl font-bold text-red-600">{counts.suspended}</p>
            </div>
          </div>

          {/* User Management Section */}
          <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-[400px]">
            <div className="p-5 border-b border-border bg-secondary/20 flex flex-wrap gap-4 items-center justify-between">
              <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                <Users size={18} className="text-primary" /> Annuaire des utilisateurs
              </h2>

              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher nom, email..."
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                </div>

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-foreground"
                >
                  <option value="">Tous les rôles</option>
                  <option value="admin">Administrateur</option>
                  <option value="editor">Éditeur</option>
                  <option value="auditor">Auditeur</option>
                  <option value="reader">Lecteur</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Utilisateur</th>
                    <th className="py-3.5 px-6">Rôle Actuel</th>
                    <th className="py-3.5 px-6">Modifier le Rôle</th>
                    <th className="py-3.5 px-6">Sécurité 2FA</th>
                    <th className="py-3.5 px-6">Statut du Compte</th>
                    <th className="py-3.5 px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Aucun utilisateur ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.email} className={`hover:bg-secondary/20 transition-colors ${!u.active ? 'opacity-60 bg-red-500/5' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-inner">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <RoleBadge role={u.role} />
                        </td>

                        <td className="py-4 px-6">
                          <select
                            value={u.role}
                            disabled={updatingUser === u.email}
                            onChange={e => handleRoleChange(u.email, e.target.value)}
                            className="px-3 py-1.5 bg-secondary/30 border border-border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                          >
                            <option value="admin">Administrateur</option>
                            <option value="editor">Éditeur</option>
                            <option value="auditor">Auditeur</option>
                            <option value="reader">Lecteur</option>
                          </select>
                        </td>

                        <td className="py-4 px-6 text-xs">
                          {u.totp_enabled ? (
                            <span className="text-green-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={14} /> 2FA Activé
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Inactif</span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                              Suspendu
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleStatusToggle(u.email, u.active)}
                            disabled={updatingUser === u.email}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${u.active ? 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'}`}
                          >
                            <Power size={13} />
                            {u.active ? 'Suspendre' : 'Réactiver'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Analytics View */
        <div className="space-y-6">
          {/* Top Analytics KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-primary" size={20} />
                <span className="text-xs font-medium text-muted-foreground">Documents & Chunks</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.documents || 0} <span className="text-sm font-normal text-muted-foreground">docs</span></p>
              <p className="text-xs text-muted-foreground mt-1">{stats?.chunks || 0} chunks vectorisés</p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-green-500" size={20} />
                <span className="text-xs font-medium text-muted-foreground">Latence Moyenne</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.avg_latency_ms || 0} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
              <p className="text-xs text-muted-foreground mt-1">Recherche + Rerank + LLM</p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <span className="text-xs font-medium text-muted-foreground">Taux de Succès</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.success_rate ?? 100}%</p>
              <p className="text-xs text-muted-foreground mt-1">Questions avec sources trouvées</p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-background shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="text-amber-500" size={20} />
                <span className="text-xs font-medium text-muted-foreground">Anti-Hallucination</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats?.unresolved_rate ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Information non trouvée (rejet)</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Daily Traffic Chart */}
            <div className="md:col-span-2 p-6 rounded-2xl border border-border bg-background shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> Volume quotidien de requêtes (7 derniers jours)
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {stats?.queries_30d || 0} requêtes totales
                </span>
              </div>
              <TrafficBarChart data={stats?.queries_by_day || []} />
            </div>

            {/* Document Formats Distribution Donut */}
            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <PieChart size={18} className="text-primary" /> Formats de Documents
              </h3>
              <FormatsDonutChart
                formats={stats?.document_formats || { pdf: 0, docx: 0, xlsx: 0, text: 0 }}
              />
            </div>
          </div>

          {/* Top Sources Ranking */}
          <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileStack size={18} className="text-primary" /> Top 5 des Documents les plus Cités en Sources
            </h3>
            {(!stats?.top_sources || stats.top_sources.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune donnée de source enregistrée pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.top_sources.map((src, i) => {
                  const maxCount = Math.max(...stats.top_sources!.map(s => s.count), 1);
                  const pct = Math.round((src.count / maxCount) * 100);
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                            #{i + 1}
                          </span>
                          {src.name}
                        </span>
                        <span className="font-mono text-muted-foreground font-semibold">{src.count} citation(s)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
