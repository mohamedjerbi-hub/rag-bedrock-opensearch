import type { StoredDocument } from '../mocks/engine';

export type AccessRole = 'admin' | 'editor' | 'auditor' | 'reader' | 'user';

/** Documents système (démo) visibles par tous les utilisateurs connectés. */
const SHARED_UPLOADERS = new Set(['system']);

export function canAccessDocument(
  doc: StoredDocument,
  userEmail: string,
  role: AccessRole
): boolean {
  if (['admin', 'editor'].includes(role)) return true;
  return SHARED_UPLOADERS.has(doc.uploaded_by) || doc.uploaded_by.toLowerCase() === userEmail.toLowerCase();
}

export function filterDocumentsForUser(
  docs: StoredDocument[],
  userEmail: string,
  role: AccessRole
): StoredDocument[] {
  return docs.filter(d => canAccessDocument(d, userEmail, role));
}

export function canModifyDocument(
  doc: StoredDocument,
  userEmail: string,
  role: AccessRole
): boolean {
  if (role === 'admin') return true;
  if (role === 'editor') return doc.uploaded_by.toLowerCase() === userEmail.toLowerCase();
  return false;
}

export function getAccessibleDocumentIds(
  docs: StoredDocument[],
  userEmail: string,
  role: AccessRole
): Set<string> {
  return new Set(
    filterDocumentsForUser(docs, userEmail, role)
      .filter(d => !d.is_folder)
      .map(d => d.document_id)
  );
}
