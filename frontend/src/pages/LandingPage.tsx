import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  ArrowRight, 
  FileText, 
  Search, 
  ShieldCheck, 
  Lock, 
  BarChart3, 
  BookmarkCheck, 
  CheckCircle2, 
  Menu, 
  X,
  ExternalLink,
  GraduationCap
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const targetAppUrl = isAuthenticated ? '/chat' : '/login';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 transition-colors duration-200">
      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-xs flex items-center justify-center tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
              MJ
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground leading-none">MJ Studio</span>
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5">ENI Carthage</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-muted-foreground" aria-label="Navigation principale">
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#comment-ca-marche" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#stack" className="hover:text-foreground transition-colors">Technologies</a>
            <a href="#a-propos" className="hover:text-foreground transition-colors">À propos</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link 
              to="/login" 
              className="text-xs font-semibold px-4 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/60"
            >
              Se connecter
            </Link>
            <Link
              to={targetAppUrl}
              className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              Essayer maintenant <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Ouvrir le menu de navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-6 py-4 space-y-3">
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              <a 
                href="#fonctionnalites" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground transition-colors"
              >
                Fonctionnalités
              </a>
              <a 
                href="#comment-ca-marche" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground transition-colors"
              >
                Comment ça marche
              </a>
              <a 
                href="#stack" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground transition-colors"
              >
                Technologies
              </a>
              <a 
                href="#a-propos" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-foreground transition-colors"
              >
                À propos
              </a>
            </nav>
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-xs font-semibold text-foreground bg-secondary/80 rounded-xl"
              >
                Se connecter
              </Link>
              <Link
                to={targetAppUrl}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-xs font-bold text-primary-foreground bg-primary rounded-xl flex items-center justify-center gap-1.5"
              >
                Essayer maintenant <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* 2. HERO SECTION */}
        <section className="py-16 sm:py-24 border-b border-border/60 relative overflow-hidden bg-gradient-to-b from-background via-secondary/10 to-background">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono font-semibold shadow-sm">
              <GraduationCap size={14} />
              <span>Projet Académique ENI Carthage · Mohamed Jerbi</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.15] max-w-4xl mx-auto">
              Posez vos questions, obtenez des réponses sourcées depuis vos propres documents
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Solution d'intelligence artificielle RAG d'entreprise pour analyser, rechercher et synthétiser vos documents en toute sécurité.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
              <Link
                to={targetAppUrl}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                Essayer maintenant <ArrowRight size={16} />
              </Link>
              <a
                href="#comment-ca-marche"
                className="w-full sm:w-auto bg-secondary text-secondary-foreground border border-border px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center"
              >
                Voir la démo
              </a>
            </div>

            {/* Real Application Visual Screenshot */}
            <div className="pt-8 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border bg-card p-2 sm:p-3 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/80 bg-secondary/30 rounded-t-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-green-400/80 inline-block" />
                  </div>
                  <div className="mx-auto text-[11px] font-mono text-muted-foreground bg-background/80 px-4 py-0.5 rounded-md border border-border/50">
                    http://localhost:5173/chat
                  </div>
                </div>
                <div className="overflow-hidden rounded-b-xl">
                  <img
                    src="/app-preview.png"
                    alt="Aperçu réel de l'interface de chat MJ Studio RAG avec réponses synthétisées et volet de citations sourcées"
                    className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-300"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BANDEAU DE CONFIANCE (Trust Banner) */}
        <section className="py-12 border-b border-border/60 bg-secondary/20">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-primary">PDF, DOCX, XLSX</p>
                <p className="text-xs text-muted-foreground font-medium">Formats supportés (+ TXT, MD)</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-primary">&lt; 1.5s</p>
                <p className="text-xs text-muted-foreground font-medium">Temps de réponse moyen (12ms Cache)</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-primary">100%</p>
                <p className="text-xs text-muted-foreground font-medium">Précision & Citations vérifiables</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm space-y-1">
                <p className="text-xl sm:text-2xl font-bold font-mono text-primary">Supabase Vector</p>
                <p className="text-xs text-muted-foreground font-medium">Stockage & Indexation Sémantique</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FONCTIONNALITÉS (6 cards max) */}
        <section id="fonctionnalites" className="py-20 border-b border-border/60">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Fonctionnalités Clés de la Plateforme
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Une architecture complète conçue pour l'analyse documentaire rigoureuse et sécurisée.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-sm text-foreground">Extraction Multi-Formats</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ingestion directe des fichiers PDF, Word (.docx), Excel (.xlsx) et Markdown avec suivi de progression et découpage intelligent.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Search size={20} />
                </div>
                <h3 className="font-bold text-sm text-foreground">Recherche Sémantique Hybride</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Combinaison d'indexation vectorielle sémantique et de recherche par mots-clés BM25 avec réordonnancement par Cohere Rerank.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookmarkCheck size={20} />
                </div>
                <h3 className="font-bold text-sm text-foreground">Réponses Sourcées & Citations</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Génération de réponses fluides avec citations inline cliquables et volet latéral détaillant les extraits sources exacts.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-sm text-foreground">Gestion des Rôles RBAC</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Contrôle d'accès granulaire à 4 niveaux (Administrateur, Éditeur, Auditeur, Lecteur) garantissant les droits de chaque utilisateur.
                </p>
              </div>

              {/* Card 5 */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <h3 className="font-bold text-sm text-foreground">Statistiques & Journal d'Audit</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tableau de bord administrateur avec suivi du volume de requêtes, temps de latence et journal d'audit exportable en CSV.
                </p>
              </div>

              {/* Card 6 */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <h3 className="font-bold text-sm text-foreground">Sécurité & Isolation des Données</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Authentification sécurisée JWT avec support du 2FA/TOTP RFC 6238, limitation de débit et isolation totale des espaces de travail.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. COMMENT ÇA MARCHE (3 steps) */}
        <section id="comment-ca-marche" className="py-20 border-b border-border/60 bg-secondary/10">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Comment ça marche
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Trois étapes simples pour transformer vos documents en base de connaissances interactive.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 relative">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-base flex items-center justify-center shadow-sm">
                  1
                </div>
                <h3 className="font-bold text-base text-foreground">Importer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Téléversez vos fichiers d'entreprise (PDF, Word, Excel, Markdown) dans votre espace sécurisé.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 relative">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-base flex items-center justify-center shadow-sm">
                  2
                </div>
                <h3 className="font-bold text-base text-foreground">Indexer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Découpage intelligent (chunking), génération d'embeddings vectoriels et stockage dans la base sémantique.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4 relative">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold font-mono text-base flex items-center justify-center shadow-sm">
                  3
                </div>
                <h3 className="font-bold text-base text-foreground">Interroger</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Posez vos questions en langage naturel et obtenez une réponse synthétisée avec citations exactes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. STACK TECHNIQUE */}
        <section id="stack" className="py-20 border-b border-border/60">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl text-center space-y-10">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Stack Technique Réelle du Projet
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Technologies de pointe utilisées pour la construction du pipeline RAG d'entreprise.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">React 18</span>
                <span className="text-[11px] text-muted-foreground">Interface SPA Moderne</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">TypeScript</span>
                <span className="text-[11px] text-muted-foreground">Développement Type-Safe</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">Express.js</span>
                <span className="text-[11px] text-muted-foreground">Backend API REST & SSE</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">Supabase Vector</span>
                <span className="text-[11px] text-muted-foreground">Base Vectorielle pgvector</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">Cohere Rerank</span>
                <span className="text-[11px] text-muted-foreground">Réordonnancement Multilingue</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">Tailwind CSS</span>
                <span className="text-[11px] text-muted-foreground">Design System & Tokens</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">Framer Motion</span>
                <span className="text-[11px] text-muted-foreground">Animations & Transitions</span>
              </div>
              <div className="p-4 rounded-xl border border-border/80 bg-card shadow-sm flex flex-col items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-foreground">Node.js</span>
                <span className="text-[11px] text-muted-foreground">Runtime Serveur</span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. À PROPOS */}
        <section id="a-propos" className="py-20 border-b border-border/60 bg-secondary/10">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="p-8 sm:p-10 rounded-3xl border border-border bg-card shadow-lg space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-bold font-mono text-base flex items-center justify-center shadow-md">
                  MJ
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">MJ Studio — Mohamed Jerbi</h2>
                  <p className="text-xs text-primary font-mono font-semibold">École Nationale d'Ingénieurs de Carthage (ENI Carthage)</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <p>
                  Le projet <strong className="text-foreground">MJ Studio RAG</strong> a été conçu et développé par <strong className="text-foreground">Mohamed Jerbi</strong> dans le cadre académique de l'ENI Carthage. Il répond aux problématiques majeures d'accès à l'information d'entreprise par l'intelligence artificielle.
                </p>
                <p>
                  Grâce à une combinaison rigoureuse de recherche vectorielle sémantique, de réordonnancement par modèle de reranking et de garde-fous anti-hallucinations, la plateforme garantit que chaque réponse générée s'appuie strictement sur des données documentaires vérifiables.
                </p>
              </div>

              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <CheckCircle2 size={16} className="text-primary" />
                  <span>Version 1.0.0 · Production Ready</span>
                </div>
                <a
                  href="https://github.com/mohamedjerbi-hub/rag-bedrock-opensearch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  Profil GitHub Mohamed Jerbi <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <p>© 2026 MJ Studio — Mohamed Jerbi · ENI Carthage</p>

          <div className="flex items-center gap-6">
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#comment-ca-marche" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a 
              href="https://github.com/mohamedjerbi-hub/rag-bedrock-opensearch" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
