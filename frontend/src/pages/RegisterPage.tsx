import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { motion } from 'framer-motion';
import { User, Lock, KeyRound, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { getErrorMessage, validateEmail, validatePassword } from '../lib/utils';

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

    if (!name.trim()) { setError('Veuillez saisir votre nom.'); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création du compte.'));
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Prénom Nom"
                className="w-full pl-12 pr-4 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-sm"
              />
              <User size={18} className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full pl-12 pr-4 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-sm"
              />
              <Mail size={18} className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full pl-12 pr-4 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-sm"
              />
              <Lock size={18} className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            <div className="relative group">
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="w-full pl-12 pr-4 min-h-[44px] rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-sm"
              />
              <Lock size={18} className="absolute left-4 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-error bg-error/10 rounded-xl px-4 py-3 border border-error/20"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound size={16} /> 
              {isLoading ? 'Création en cours…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1 p-1">
              Se connecter <ArrowRight size={13} />
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side: Clean Corporate Information Card */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-secondary border-l border-border p-12 items-center justify-center">
        <div className="relative z-10 max-w-lg p-8 rounded-2xl bg-card border border-border shadow-xl">
          <h2 className="text-2xl font-bold text-foreground mb-3">Recherche documentaire avancée</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Posez vos questions naturellement. Notre système RAG hybride (Vectoriel + BM25) interroge vos bases de connaissances et cite précisément chaque source.
          </p>
          <div className="flex gap-3">
            <div className="px-3.5 min-h-[36px] flex items-center justify-center rounded-xl bg-secondary text-foreground text-xs font-semibold border border-border">
              Sécurisé & Conforme
            </div>
            <div className="px-3.5 min-h-[36px] flex items-center justify-center rounded-xl bg-secondary text-foreground text-xs font-semibold border border-border">
              Reranking Cohere
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
