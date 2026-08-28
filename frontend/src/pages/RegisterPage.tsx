import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { motion } from 'framer-motion';
import { User, Lock, KeyRound, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.register({ email: email.trim(), password, name: name.trim() });
      login(response.user, response.token);
      toast.success(`Bienvenue ${response.user.name}, votre compte a été créé avec succès.`);
      navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/50 flex items-center justify-center shadow-lg mb-8 overflow-hidden">
              <img src="/logo-mj.svg" alt="MJ Studio Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
              Créer un compte
            </h1>
            <p className="text-muted-foreground text-lg">
              Rejoignez SmartDocs et commencez à interroger vos bases de connaissances intelligentes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Prénom Nom"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-secondary/20 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background transition-all"
              />
              <User size={18} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-secondary/20 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background transition-all"
              />
              <Mail size={18} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-secondary/20 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background transition-all"
              />
              <Lock size={18} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-secondary/20 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-background transition-all"
              />
              <Lock size={18} className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-error bg-error/10 rounded-xl px-4 py-3 border border-error/20"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all shadow-lg shadow-primary/25 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <KeyRound size={18} className="group-hover:rotate-12 transition-transform" /> 
              {isLoading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1 group">
              Se connecter <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side: Dynamic Visuals (Premium) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-secondary overflow-hidden items-center justify-center">
        {/* Dynamic mesh gradients */}
        <div className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none">
           <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-primary/40 blur-[120px] animate-pulse-slow" />
           <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-accent/30 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Glassmorphism card overlay */}
        <div className="relative z-10 max-w-lg p-10 rounded-3xl bg-background/20 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">L'avenir de la recherche documentaire</h2>
          <p className="text-white/80 text-lg leading-relaxed mb-6">
            Posez vos questions naturellement. Notre IA parcourt des milliers de documents, synthétise les réponses et vous fournit des sources traçables en quelques millisecondes.
          </p>
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium backdrop-blur-md">
              ✨ Sécurisé
            </div>
            <div className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium backdrop-blur-md">
              ⚡ Ultra-rapide
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
