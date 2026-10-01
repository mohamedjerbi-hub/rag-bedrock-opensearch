import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FileText, 
  Loader2, 
  Download, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  AlertCircle, 
  Table as TableIcon,
  FileCode,
  Lock,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { api, SignedUrlResponse } from '../api/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Document, Page, pdfjs } from 'react-pdf';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import Papa from 'papaparse';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface SourceViewerModalProps {
  documentId: string | null;
  page?: number | null;
  excerpt?: string | null;
  documentName?: string | null;
  onClose: () => void;
}

export function SourceViewerModal({
  documentId,
  page,
  excerpt,
  documentName,
  onClose,
}: SourceViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [signedData, setSignedData] = useState<SignedUrlResponse | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fallbackContent, setFallbackContent] = useState<string | null>(null);

  // PDF controls state
  const [numPages, setNumPages] = useState<number>(1);
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(page || 1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);

  // Excel state
  const [sheets, setSheets] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  const [highlightedRowIdx, setHighlightedRowIdx] = useState<number | null>(null);

  // DOCX HTML state
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Text/MD state
  const [textRaw, setTextRaw] = useState<string | null>(null);

  const highlightedRef = useRef<HTMLTableRowElement | HTMLDivElement | null>(null);

  useEffect(() => {
    if (!documentId) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setIsForbidden(false);
    setSignedData(null);
    setFileBlob(null);
    setFallbackContent(null);
    setDocxHtml(null);
    setTextRaw(null);
    setSheets([]);
    setPdfPageNumber(page || 1);
    setHighlightedRowIdx(null);

    const loadSourceDocument = async () => {
      try {
        // Step 1: Fetch signed URL & document metadata from backend (enforces role access)
        const info = await api.getSignedUrl(documentId);
        if (!isMounted) return;
        setSignedData(info);

        if (info.size_exceeded) {
          setLoading(false);
          return;
        }

        // Step 2: Download file Blob (utilizing client-side session cache)
        const blob = await api.fetchDocumentBlob(documentId, info.signed_url);
        if (!isMounted) return;
        setFileBlob(blob);

        const fileName = (documentName || info.document.name || '').toLowerCase();
        const ext = fileName.split('.').pop() || '';

        // Step 3: Parse per file type
        if (['xlsx', 'xls'].includes(ext)) {
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetList = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name];
            const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
            return { name, data };
          });
          setSheets(sheetList);

          // Find row matching excerpt
          if (excerpt && sheetList.length > 0) {
            const firstSheetData = sheetList[0].data;
            const normExcerpt = excerpt.toLowerCase().trim();
            const keywords = normExcerpt.split(/\s+/).filter(w => w.length > 3);

            let bestMatchRow = -1;
            let maxScore = 0;

            firstSheetData.forEach((row, rIdx) => {
              const rowStr = row.map(c => String(c)).join(' ').toLowerCase();
              if (rowStr.includes(normExcerpt.substring(0, 30))) {
                bestMatchRow = rIdx;
                maxScore = 999;
              } else {
                let hits = 0;
                keywords.forEach(kw => {
                  if (rowStr.includes(kw)) hits++;
                });
                if (hits > maxScore && hits >= 2) {
                  maxScore = hits;
                  bestMatchRow = rIdx;
                }
              }
            });

            if (bestMatchRow !== -1) {
              setHighlightedRowIdx(bestMatchRow);
            }
          }
        } else if (ext === 'csv') {
          const text = await blob.text();
          Papa.parse(text, {
            skipEmptyLines: true,
            complete: (results) => {
              const csvData = results.data as any[][];
              setSheets([{ name: 'CSV Data', data: csvData }]);
              if (excerpt) {
                const normExcerpt = excerpt.toLowerCase().trim();
                const matchRow = csvData.findIndex(row =>
                  row.map(c => String(c)).join(' ').toLowerCase().includes(normExcerpt.substring(0, 30))
                );
                if (matchRow !== -1) setHighlightedRowIdx(matchRow);
              }
            }
          });
        } else if (ext === 'docx') {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          let rawHtml = result.value;

          // Highlight passage in HTML
          if (excerpt && excerpt.trim().length > 5) {
            const cleanExcerpt = excerpt.trim();
            const searchSnippet = cleanExcerpt.substring(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${searchSnippet})`, 'gi');
            if (regex.test(rawHtml)) {
              rawHtml = rawHtml.replace(
                regex,
                `<mark class="highlight-mark bg-amber-300/40 text-amber-950 dark:bg-amber-500/30 dark:text-amber-100 px-1 py-0.5 rounded font-semibold border-b-2 border-amber-500 shadow-sm">$1</mark>`
              );
            }
          }
          setDocxHtml(rawHtml);
        } else if (['txt', 'md'].includes(ext)) {
          const text = await blob.text();
          setTextRaw(text);
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err?.message || 'Erreur de chargement du document.';
        if (msg.includes('Accès refusé') || msg.includes('403')) {
          setIsForbidden(true);
        } else {
          setErrorMsg(msg);
        }

        // Fetch fallback extracted text chunk if raw file fails
        try {
          const data = await api.get<{ content: string }>(`/documents/${documentId}/content`);
          setFallbackContent(data.content);
        } catch (_) {}
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSourceDocument();

    return () => {
      isMounted = false;
    };
  }, [documentId, page, excerpt, documentName]);

  // Auto-scroll highlighted row/element into view
  useEffect(() => {
    if (highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightedRowIdx, docxHtml, activeSheetIdx]);

  if (!documentId) return null;

  const fileName = signedData?.document.name || documentName || 'Document Source';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

  const getFileTypeBadge = () => {
    switch (fileExt) {
      case 'pdf':
        return { label: 'PDF Document', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: FileText };
      case 'xlsx':
      case 'xls':
        return { label: 'Feuille Excel', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: TableIcon };
      case 'csv':
        return { label: 'Fichier CSV', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20', icon: TableIcon };
      case 'docx':
        return { label: 'Document Word', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: FileText };
      case 'md':
      case 'txt':
        return { label: 'Texte / Markdown', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: FileCode };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return { label: 'Image OCR', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: ImageIcon };
      default:
        return { label: 'Fichier Document', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: FileText };
    }
  };

  const badge = getFileTypeBadge();
  const IconComponent = badge.icon;

  const handleDownloadOriginal = () => {
    if (signedData?.signed_url) {
      const a = document.createElement('a');
      a.href = signedData.signed_url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Téléchargement du fichier original initié');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-xl border ${badge.color}`}>
                <IconComponent size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm sm:text-base text-foreground truncate max-w-md" title={fileName}>
                    {fileName}
                  </h2>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                {signedData?.document.size_bytes && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Taille : {(signedData.document.size_bytes / (1024 * 1024)).toFixed(2)} MB
                    {page ? ` · Citation Page ${page}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-2">
              {signedData?.signed_url && (
                <>
                  <button
                    onClick={handleDownloadOriginal}
                    className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border text-xs font-semibold transition-all shadow-sm"
                    title="Télécharger l'original"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">Télécharger</span>
                  </button>
                  <a
                    href={signedData.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink size={17} />
                  </a>
                </>
              )}
              <div className="w-[1px] h-5 bg-border mx-1" />
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Sub-Header Citation Highlight Ribbon */}
          {excerpt && !loading && !isForbidden && (
            <div className="bg-primary/10 border-b border-primary/20 px-5 py-2.5 flex items-center gap-3 text-xs text-foreground shrink-0 shadow-inner">
              <Sparkles size={16} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-primary mr-2 font-mono text-[11px] uppercase">Passage cité :</span>
                <span className="italic text-foreground/90 truncate inline-block max-w-full">
                  "{excerpt}"
                </span>
              </div>
            </div>
          )}

          {/* Body Viewer */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-background/50 relative flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-medium text-sm">Récupération sécurisée du fichier source…</p>
                <p className="text-xs text-muted-foreground mt-1">Génération d'URL signée Supabase & vérification des rôles</p>
              </div>
            ) : isForbidden ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
                  <Lock size={28} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Accès non autorisé (403)</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                  Vous n'avez pas les privilèges requis pour consulter ce document source. Ce fichier ne fait pas partie de votre périmètre d'accès autorisé.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-secondary text-foreground rounded-xl border border-border text-xs font-semibold hover:bg-secondary/80 transition-all"
                >
                  Fermer l'aperçu
                </button>
              </div>
            ) : signedData?.size_exceeded ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Fichier volumineux</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                  Ce document dépasse la taille maximale pour la prévisualisation directe en ligne (25 Mo). Vous pouvez le télécharger pour le consulter localement.
                </p>
                <button
                  onClick={handleDownloadOriginal}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-xs flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md"
                >
                  <Download size={15} /> Télécharger le fichier original
                </button>
              </div>
            ) : errorMsg && !fallbackContent ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Erreur de chargement</h3>
                <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
                  {errorMsg}
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-secondary text-foreground rounded-xl border border-border text-xs font-semibold hover:bg-secondary/80 transition-all"
                >
                  Fermer
                </button>
              </div>
            ) : fileExt === 'pdf' && fileBlob ? (
              <div className="flex flex-col items-center flex-1 space-y-4">
                {/* PDF Controls */}
                <div className="sticky top-0 z-20 flex items-center gap-2 bg-card/90 backdrop-blur border border-border px-4 min-h-[44px] rounded-2xl shadow-md text-xs font-medium">
                  <button
                    disabled={pdfPageNumber <= 1}
                    onClick={() => setPdfPageNumber(p => Math.max(1, p - 1))}
                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary disabled:opacity-30 transition-colors"
                    title="Page précédente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-mono px-2">
                    Page <strong>{pdfPageNumber}</strong> sur {numPages}
                  </span>
                  <button
                    disabled={pdfPageNumber >= numPages}
                    onClick={() => setPdfPageNumber(p => Math.min(numPages, p + 1))}
                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary disabled:opacity-30 transition-colors"
                    title="Page suivante"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="w-[1px] h-5 bg-border mx-1" />
                  <button
                    onClick={() => setPdfScale(s => Math.max(0.6, s - 0.15))}
                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
                    title="Zoom arrière"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="font-mono text-[11px] font-bold">{Math.round(pdfScale * 100)}%</span>
                  <button
                    onClick={() => setPdfScale(s => Math.min(2.0, s + 0.15))}
                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
                    title="Zoom avant"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    onClick={() => setPdfScale(1.0)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
                    title="Réinitialiser"
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>

                {/* PDF Render Container */}
                <div className="w-full flex justify-center overflow-auto py-2 custom-scrollbar">
                  <Document
                    file={fileBlob}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={
                      <div className="flex items-center gap-2 p-8 text-muted-foreground">
                        <Loader2 className="animate-spin" size={18} /> Chargement des pages PDF…
                      </div>
                    }
                    error={
                      <div className="p-6 text-red-500 text-xs">Échec de l'affichage du canvas PDF.</div>
                    }
                  >
                    <Page
                      pageNumber={pdfPageNumber}
                      scale={pdfScale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-xl rounded-lg overflow-hidden border border-border"
                    />
                  </Document>
                </div>
              </div>
            ) : ['xlsx', 'xls', 'csv'].includes(fileExt) && sheets.length > 0 ? (
              <div className="flex flex-col flex-1 overflow-hidden space-y-3">
                {/* Excel Sheet Tabs */}
                {sheets.length > 1 && (
                  <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto shrink-0">
                    {sheets.map((s, idx) => (
                      <button
                        key={s.name}
                        onClick={() => setActiveSheetIdx(idx)}
                        className={`px-4 min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                          activeSheetIdx === idx
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Table Render */}
                <div className="flex-1 overflow-auto border border-border rounded-xl bg-card shadow-inner custom-scrollbar">
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <thead className="sticky top-0 bg-muted border-b border-border z-10 text-[11px] font-mono text-muted-foreground uppercase">
                      <tr>
                        <th className="p-2 border-r border-border text-center w-12 bg-muted/90">#</th>
                        {sheets[activeSheetIdx]?.data[0]?.map((_, colIdx) => (
                          <th key={colIdx} className="p-2 border-r border-border min-w-[120px]">
                            {String.fromCharCode(65 + (colIdx % 26))}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheets[activeSheetIdx]?.data.map((row, rIdx) => {
                        const isHighlighted = rIdx === highlightedRowIdx;
                        return (
                          <tr
                            key={rIdx}
                            ref={isHighlighted ? (el => (highlightedRef.current = el)) : null}
                            className={`border-b border-border/50 transition-colors ${
                              isHighlighted
                                ? 'bg-amber-500/25 dark:bg-amber-500/35 font-semibold text-foreground border-l-4 border-l-amber-500'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <td className="p-2 border-r border-border text-center font-mono text-[10px] text-muted-foreground bg-muted/30 select-none">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 border-r border-border whitespace-pre-wrap break-words">
                                {cell !== null && cell !== undefined ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : fileExt === 'docx' && docxHtml ? (
              <div className="flex-1 overflow-auto border border-border rounded-2xl bg-card p-6 sm:p-10 shadow-inner custom-scrollbar">
                <div
                  ref={el => (highlightedRef.current = el)}
                  className="prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed font-serif text-foreground/95"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            ) : textRaw !== null ? (
              <div className="flex-1 overflow-auto border border-border rounded-2xl bg-card p-6 sm:p-8 custom-scrollbar">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{textRaw}</ReactMarkdown>
                </div>
              </div>
            ) : ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) && fileBlob ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto custom-scrollbar">
                <div className="relative max-w-full max-h-full rounded-2xl border border-border shadow-2xl overflow-hidden bg-muted/30 p-3 flex flex-col items-center justify-center">
                  <img
                    src={URL.createObjectURL(fileBlob)}
                    alt={fileName}
                    className="max-w-full max-h-[68vh] object-contain rounded-xl border border-border/50 shadow-md"
                  />
                  <div className="mt-3 text-[11px] text-muted-foreground font-mono bg-card px-3 py-1 rounded-full border border-border shadow-sm">
                    Aperçu natif image (OCR Tesseract.js bilingue fra+eng)
                  </div>
                </div>
              </div>
            ) : (
              /* Generic Fallback to Extracted Text Chunk */
              <div className="flex-1 overflow-auto border border-border rounded-2xl bg-card p-6 sm:p-8 space-y-4 custom-scrollbar">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>Aperçu en mode texte extrait (format brut d'indexation).</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {fallbackContent || excerpt || 'Aucun contenu textuel disponible.'}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
