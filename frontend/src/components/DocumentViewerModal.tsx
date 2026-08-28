import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import toast from 'react-hot-toast';

interface DocumentViewerModalProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentViewerModal({ documentId, onClose }: DocumentViewerModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
      setLoading(true);
      setContent('');
      setTitle('Document ID: ' + documentId);
      
      try {
        const data = await api.get<{ content: string; title?: string }>(`/documents/${documentId}/content`);
        setContent(data.content);
        if (data.title) setTitle(data.title);
      } catch (err: any) {
        toast.error("Impossible de charger le contenu complet du document.");
        setContent("Contenu indisponible.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  return (
    <AnimatePresence>
      {documentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText size={20} />
                </div>
                <h2 className="font-semibold text-lg line-clamp-1">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                  <p>Chargement du document complet...</p>
                </div>
              ) : (
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                  {content.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 text-foreground/90 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
