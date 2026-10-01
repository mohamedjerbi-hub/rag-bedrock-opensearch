import { useEffect, useState, useMemo } from 'react';
import { MessageSquare, Search, Download, Zap, ShieldAlert, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { api, QueryHistoryItem, SecurityLogItem } from '../api/client';
import { SkeletonTable } from '../components/Skeleton';

function SeverityBadge({ severity }: { severity: 'info' | 'warning' | 'critical' }) {
  const map = {
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[severity] || map.info}`}>
      {severity}
    </span>
  );
}

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<'rag' | 'security'>('security');

  // RAG query history
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  // Security logs
  const [securityLogs, setSecurityLogs] = useState<SecurityLogItem[]>([]);

  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ items: QueryHistoryItem[] }>('/history').catch(() => ({ items: [] })),
      api.getSecurityLogs().catch(() => ({ items: [] })),
    ])
      .then(([ragRes, secRes]) => {
        setHistory(ragRes.items || []);
        setSecurityLogs(secRes.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const users = useMemo(() => {
    const list = [...history.map(h => h.user), ...securityLogs.map(s => s.user_email)];
    return [...new Set(list)].filter(Boolean);
  }, [history, securityLogs]);

  const filteredRag = useMemo(() => {
    return history.filter(item => {
      const matchSearch = !search.trim() || item.question.toLowerCase().includes(search.toLowerCase());
      const matchUser = !userFilter || item.user === userFilter;
      return matchSearch && matchUser;
    });
  }, [history, search, userFilter]);

  const filteredSecurity = useMemo(() => {
    return securityLogs.filter(item => {
      const matchSearch = !search.trim() ||
        item.event_type.toLowerCase().includes(search.toLowerCase()) ||
        item.user_email.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(item.details).toLowerCase().includes(search.toLowerCase());

      const matchUser = !userFilter || item.user_email === userFilter;
      const matchSeverity = !severityFilter || item.severity === severityFilter;

      return matchSearch && matchUser && matchSeverity;
    });
  }, [securityLogs, search, userFilter, severityFilter]);

  const totalLatency = filteredRag.reduce((s, q) => s + q.latency_ms, 0);
  const avgLatency = filteredRag.length > 0 ? Math.round(totalLatency / filteredRag.length) : 0;
  const criticalCount = securityLogs.filter(s => s.severity === 'critical' || s.severity === 'warning').length;

  const handleExportCSV = () => {
    let rows: (string | number)[][] = [];

    if (activeTab === 'rag') {
      rows = [
        ['ID', 'Question', 'Utilisateur', 'Latence (ms)', 'Sources', 'Date'],
        ...filteredRag.map(q => [
          q.query_id,
          `"${q.question.replace(/"/g, '""')}"`,
          q.user,
          q.latency_ms,
          q.sources.map(s => s.document_name).join('; '),
          new Date(q.timestamp).toISOString(),
        ]),
      ];
    } else {
      rows = [
        ['ID', 'Événement', 'Sévérité', 'Utilisateur', 'Adresse IP', 'Détails', 'Horodatage'],
        ...filteredSecurity.map(s => [
          s.id,
          s.event_type,
          s.severity,
          s.user_email,
          s.ip_address || 'N/A',
          `"${JSON.stringify(s.details).replace(/"/g, '""')}"`,
          new Date(s.timestamp).toISOString(),
        ]),
      ];
    }

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${activeTab}_smartdocs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 h-full overflow-y-auto">
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="text-primary" size={28} />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Registre d'Audit & Sécurité</h1>
          </div>
          <p className="text-muted-foreground text-sm">Traçabilité complète des événements de sécurité, connexions 2FA et requêtes RAG</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 min-h-[44px] bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-xl font-semibold text-xs transition-colors shrink-0 shadow-sm"
        >
          <Download size={15} /> Exporter CSV ({activeTab.toUpperCase()})
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-3">
          <ShieldAlert size={22} className="text-primary" />
          <div>
            <p className="text-lg font-bold text-foreground">{securityLogs.length}</p>
            <p className="text-xs text-muted-foreground">Événements de sécurité</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-3">
          <AlertTriangle size={22} className="text-amber-500" />
          <div>
            <p className="text-lg font-bold text-foreground">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Alertes / Avertissements</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-3">
          <MessageSquare size={22} className="text-primary" />
          <div>
            <p className="text-lg font-bold text-foreground">{history.length}</p>
            <p className="text-xs text-muted-foreground">Total requêtes RAG</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-3">
          <Zap size={22} className="text-green-500" />
          <div>
            <p className="text-lg font-bold text-foreground">{avgLatency} ms</p>
            <p className="text-xs text-muted-foreground">Latence moyenne RAG</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-6 min-h-[44px] font-semibold text-xs border-b-2 transition-all ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <ShieldAlert size={16} /> Journal de Sécurité & Accès ({filteredSecurity.length})
        </button>
        <button
          onClick={() => setActiveTab('rag')}
          className={`flex items-center gap-2 px-6 min-h-[44px] font-semibold text-xs border-b-2 transition-all ${activeTab === 'rag' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Activity size={16} /> Journal des Requêtes RAG ({filteredRag.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'security' ? 'Rechercher un événement, email, IP...' : 'Rechercher une question...'}
            className="w-full pl-10 pr-4 min-h-[44px] bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-foreground"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
        </div>

        {activeTab === 'security' && (
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-4 min-h-[44px] bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-foreground font-medium"
          >
            <option value="">Toutes les sévérités</option>
            <option value="info">INFO</option>
            <option value="warning">WARNING</option>
            <option value="critical">CRITICAL</option>
          </select>
        )}

        <select
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          className="px-4 min-h-[44px] bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-foreground font-medium"
        >
          <option value="">Tous les utilisateurs</option>
          {users.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Table Content */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex-1 min-h-[300px]">
        {activeTab === 'security' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Événement</th>
                  <th className="py-3.5 px-4">Sévérité</th>
                  <th className="py-3.5 px-4">Utilisateur</th>
                  <th className="py-3.5 px-4">IP</th>
                  <th className="py-3.5 px-4">Détails</th>
                  <th className="py-3.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-xs">
                {filteredSecurity.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans">
                      Aucun événement d'audit trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredSecurity.map(log => (
                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">{log.event_type}</td>
                      <td className="py-3.5 px-4"><SeverityBadge severity={log.severity} /></td>
                      <td className="py-3.5 px-4 text-foreground">{log.user_email}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{log.ip_address || '127.0.0.1'}</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-sans max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Question</th>
                  <th className="py-3.5 px-4">Utilisateur</th>
                  <th className="py-3.5 px-4">Latence</th>
                  <th className="py-3.5 px-4">Sources</th>
                  <th className="py-3.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredRag.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Aucune requête enregistrée.
                    </td>
                  </tr>
                ) : (
                  filteredRag.map(q => (
                    <tr key={q.query_id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-md">{q.question}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{q.user}</td>
                      <td className="py-3.5 px-4 font-mono">{q.latency_ms} ms</td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {q.sources.length} document(s)
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {new Date(q.timestamp).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
