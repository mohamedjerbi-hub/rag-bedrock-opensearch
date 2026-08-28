import { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Trash2, RefreshCw, Folder, FolderPlus, ChevronRight, Search, Edit2, Home, Eye } from 'lucide-react';
import { api, DocumentItem } from '../api/client';
import toast from 'react-hot-toast';
import { formatDate, formatBytes, getErrorMessage } from '../lib/utils';
import { SkeletonTable } from '../components/Skeleton';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

const ACCEPTED_TYPES = ['.md', '.txt', '.pdf', '.docx', '.doc', '.xlsx', '.xls'];
const MAX_SIZE_MB = 20;

function StatusBadge({ status, isFolder }: { status: string; isFolder?: boolean }) {
  if (isFolder) return null;
  const cfg = {
    indexed: { label: 'Indexé', cls: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
    indexing: { label: 'Indexation…', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Loader2, animate: true },
    extracting: { label: 'Extraction…', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Loader2, animate: true },
    chunking: { label: 'Découpage…', cls: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Loader2, animate: true },
    vectorizing: { label: 'Vectorisation…', cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: Loader2, animate: true },
    pending: { label: 'En attente', cls: 'bg-muted text-muted-foreground border-border', icon: Loader2 },
    failed: { label: 'Échec', cls: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
  }[status] || { label: status, cls: 'bg-muted text-muted-foreground border-border', icon: FileText };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon size={12} className={cfg.animate ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get<{ items: DocumentItem[] }>('/documents');
      setDocuments(res.items);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Erreur de chargement des documents'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    const iv = setInterval(fetchDocuments, 5000);
    return () => clearInterval(iv);
  }, [fetchDocuments]);

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'Racine' }];
    let curr = currentFolderId;
    const tempPath = [];
    while (curr) {
      const folder = documents.find(d => d.document_id === curr);
      if (folder) {
        tempPath.unshift({ id: folder.document_id, name: folder.name });
        curr = folder.parent_id;
      } else {
        break;
      }
    }
    return [...path, ...tempPath];
  }, [documents, currentFolderId]);

  // Filtering & Sorting
  const currentItems = useMemo(() => {
    let items = documents.filter(d => {
      if (debouncedSearch.trim()) {
        return d.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      }
      return d.parent_id === currentFolderId;
    });

    return items.sort((a, b) => {
      if (a.is_folder && !b.is_folder) return -1;
      if (!a.is_folder && b.is_folder) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [documents, currentFolderId, debouncedSearch]);

  // Optimistic Upload with Real Progress Bar
  const handleFiles = useCallback(async (files: File[]) => {
    const errors: string[] = [];
    const success: string[] = [];
    const valid = files.filter(f => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${f.name} : trop volumineux (max ${MAX_SIZE_MB} Mo)`);
        return false;
      }
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) {
        errors.push(`${f.name} : type non supporté`);
        return false;
      }
      return true;
    });

    if (valid.length === 0) {
      if (errors.length > 0) toast.error(errors.join(', '));
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    for (const file of valid) {
      // Optimistic Item Creation
      const tempId = crypto.randomUUID();
      const optimisticDoc: DocumentItem = {
        document_id: tempId,
        name: file.name,
        is_folder: false,
        parent_id: currentFolderId,
        size_bytes: file.size,
        mime_type: file.type || 'text/plain',
        status: 'indexing',
        chunk_count: 0,
        uploaded_by: 'Moi',
        uploaded_at: new Date().toISOString(),
      };

      setDocuments(prev => [optimisticDoc, ...prev]);

      try {
        await api.uploadFile(file, currentFolderId, (pct) => setUploadProgress(pct));
        success.push(file.name);
      } catch (e: unknown) {
        errors.push(`${file.name} : ${getErrorMessage(e)}`);
        // Rollback on failure
        setDocuments(prev => prev.filter(d => d.document_id !== tempId));
      }
    }

    setUploading(false);
    setUploadProgress(0);
    fetchDocuments();
    if (success.length > 0) toast.success(`${success.length} fichier(s) importé(s)`);
    if (errors.length > 0) toast.error(`${errors.length} erreur(s) lors de l'envoi`);
  }, [currentFolderId, fetchDocuments]);

  // Optimistic Delete
  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${doc.is_folder ? 'ce dossier' : 'ce document'} ?`)) return;

    const backupDocs = [...documents];
    // Optimistic Removal
    setDocuments(prev => prev.filter(d => d.document_id !== doc.document_id));

    try {
      await api.del(`/documents/${doc.document_id}`);
      toast.success('Supprimé avec succès');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Erreur lors de la suppression'));
      // Rollback
      setDocuments(backupDocs);
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt('Nom du nouveau dossier :');
    if (!name?.trim()) return;
    try {
      await api.createFolder(name.trim(), currentFolderId);
      fetchDocuments();
      toast.success('Dossier créé');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Erreur lors de la création du dossier'));
    }
  };

  const handleRename = async (doc: DocumentItem) => {
    const newName = window.prompt('Nouveau nom :', doc.name);
    if (!newName?.trim() || newName === doc.name) return;
    try {
      await api.updateDocument(doc.document_id, { name: newName.trim() });
      fetchDocuments();
      toast.success('Renommé avec succès');
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Erreur lors du renommage'));
    }
  };

  // Drag Handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  if (loading) {
    return (
      <div className="p-8 h-full overflow-y-auto">
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bibliothèque Documentaire</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos documents d'entreprise. Ingestion en temps réel avec extraction de texte et vectorisation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateFolder}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border rounded-xl text-sm font-medium transition-colors"
          >
            <FolderPlus size={16} /> Nouveau Dossier
          </button>
          <button
            onClick={fetchDocuments}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} /> Actualiser
          </button>
        </div>
      </div>

      {/* Upload Drop Zone & Progress */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative p-6 border-2 border-dashed rounded-2xl transition-all text-center ${
          isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/80 bg-background hover:border-primary/40'
        }`}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={e => e.target.files?.length && handleFiles(Array.from(e.target.files))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Upload size={22} />
          </div>
          <p className="font-semibold text-foreground text-sm">
            Glissez-déposez vos fichiers ici ou <span className="text-primary underline">parcourez</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Formats supportés : PDF, DOCX, XLSX, TXT, MD (Max {MAX_SIZE_MB} Mo)
          </p>
        </div>

        {/* Real Upload Progress Bar */}
        {uploading && (
          <div className="mt-4 max-w-md mx-auto space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-primary">
              <span>Téléversement en cours…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background border border-border/80 p-4 rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-1 text-sm font-medium overflow-x-auto">
          {breadcrumb.map((item, idx) => (
            <div key={item.id || 'root'} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
              <button
                onClick={() => setCurrentFolderId(item.id)}
                className={`hover:text-primary transition-colors flex items-center gap-1.5 ${
                  currentFolderId === item.id ? 'font-bold text-primary' : 'text-muted-foreground'
                }`}
              >
                {idx === 0 ? <Home size={16} /> : <Folder size={16} />}
                {item.name}
              </button>
            </div>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un document…"
            className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-foreground"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-[350px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-6">Nom</th>
                <th className="py-3.5 px-6">Taille</th>
                <th className="py-3.5 px-6">Statut / Indexation</th>
                <th className="py-3.5 px-6">Fragments</th>
                <th className="py-3.5 px-6">Date d'Ajout</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Aucun document présent dans ce dossier.
                  </td>
                </tr>
              ) : (
                currentItems.map(doc => (
                  <tr key={doc.document_id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="py-4 px-6 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        {doc.is_folder ? (
                          <Folder size={20} className="text-amber-500 shrink-0" />
                        ) : (
                          <FileText size={20} className="text-primary shrink-0" />
                        )}
                        {doc.is_folder ? (
                          <button
                            onClick={() => setCurrentFolderId(doc.document_id)}
                            className="font-bold hover:text-primary transition-colors text-left"
                          >
                            {doc.name}
                          </button>
                        ) : (
                          <span className="truncate max-w-[280px]">{doc.name}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-xs text-muted-foreground font-mono">
                      {doc.is_folder ? '-' : formatBytes(doc.size_bytes)}
                    </td>

                    <td className="py-4 px-6">
                      <StatusBadge status={doc.status} isFolder={doc.is_folder} />
                    </td>

                    <td className="py-4 px-6 text-xs text-muted-foreground font-mono">
                      {doc.is_folder ? '-' : doc.chunk_count}
                    </td>

                    <td className="py-4 px-6 text-xs text-muted-foreground">
                      {formatDate(doc.uploaded_at)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!doc.is_folder && doc.status === 'indexed' && (
                          <button
                            onClick={() => setSelectedDocumentId(doc.document_id)}
                            className="p-1.5 hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-lg transition-colors"
                            title="Consulter le document"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRename(doc)}
                          className="p-1.5 hover:bg-secondary text-muted-foreground rounded-lg transition-colors"
                          title="Renommer"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 hover:bg-red-500/10 hover:text-red-600 text-muted-foreground rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DocumentViewerModal
        documentId={selectedDocumentId}
        onClose={() => setSelectedDocumentId(null)}
      />
    </div>
  );
}
