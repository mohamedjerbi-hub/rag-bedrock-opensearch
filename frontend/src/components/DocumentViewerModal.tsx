import { SourceViewerModal } from './SourceViewerModal';

export interface DocumentViewerModalProps {
  documentId: string | null;
  page?: number | null;
  excerpt?: string | null;
  documentName?: string | null;
  onClose: () => void;
}

export function DocumentViewerModal({
  documentId,
  page,
  excerpt,
  documentName,
  onClose,
}: DocumentViewerModalProps) {
  if (!documentId) return null;
  return (
    <SourceViewerModal
      documentId={documentId}
      page={page}
      excerpt={excerpt}
      documentName={documentName}
      onClose={onClose}
    />
  );
}
