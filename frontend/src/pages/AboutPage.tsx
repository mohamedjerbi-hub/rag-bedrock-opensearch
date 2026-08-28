import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Database, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans p-6 sm:p-12">
      <div className="max-w-3xl mx-auto w-full space-y-8 flex-1">
        {/* Back Link */}
        <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Retour à l'application
        </Link>

        {/* Header */}
        <div className="space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <img src="/logo-mj.svg" alt="MJ Studio Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">MJ Studio — RAG Engine</h1>
              <p className="text-xs text-primary font-mono font-semibold">
                Stage 2ème Année Cycle Ingénieur · ENI Carthage × Smartovate · Mohamed Jerbi
              </p>
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div className="space-y-4 text-sm leading-relaxed text-foreground">
          <h2 className="text-lg font-bold tracking-tight">À propos du projet</h2>
          <p className="text-muted-foreground">
            <strong>MJ Studio RAG Engine</strong> a été développé par <strong>Mohamed Jerbi</strong> dans le cadre de son <strong>stage universitaire de 2ème année Cycle Ingénieur à l'École Nationale d'Ingénieurs de Carthage (ENI Carthage)</strong>, au sein de l'entreprise <strong>Smartovate</strong>. Il s'agit d'une solution d'intelligence artificielle documentaire d'entreprise permettant d'interroger en langage naturel une base de connaissances complexe (PDF, DOCX, XLSX, TXT, MD) avec une précision absolue et des citations vérifiables.
          </p>
        </div>

        {/* Technical Architecture */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Stack Technique & Ingrédients Majeurs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Database size={16} className="text-primary" /> Moteur de Recherche Hybride
              </div>
              <p className="text-muted-foreground">
                Fusion Reciprocal Rank Fusion (RRF) combinant la recherche vectorielle sémantique et la recherche par mots-clés BM25.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Cpu size={16} className="text-primary" /> Réordonnancement Cohere Rerank
              </div>
              <p className="text-muted-foreground">
                Modèle Cohere Multilingual v3.0 réduisant les 20 meilleurs candidats aux 5 plus pertinents avec calcul de pertinence.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Lock size={16} className="text-primary" /> Sécurité RBAC & 2FA/TOTP
              </div>
              <p className="text-muted-foreground">
                Table de rôles séparée, double authentification RFC 6238, rate limiting et journal d'audit immuable.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Zap size={16} className="text-primary" /> Cache LRU en mémoire (12 ms)
              </div>
              <p className="text-muted-foreground">
                Serveur ultra-rapide pour les questions identiques avec invalidation automatique lors des modifications de documents.
              </p>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 text-xs">
          <h3 className="font-bold text-sm text-primary flex items-center gap-2">
            <CheckCircle2 size={16} /> Conformité & Performance Soutenance
          </h3>
          <ul className="grid grid-cols-2 gap-2 text-muted-foreground font-mono">
            <li>• Bundle JS: 151 KB Gzip</li>
            <li>• Latence Cache: 12 ms</li>
            <li>• Premier mot SSE: &lt; 1,5s</li>
            <li>• Navigation Pages: &lt; 200 ms</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-12 text-center text-xs font-mono text-muted-foreground">
        MJ Studio — Mohamed Jerbi · ENI Carthage · 2026
      </footer>
    </div>
  );
}
