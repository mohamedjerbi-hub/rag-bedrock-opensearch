import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Entrez votre email.');
      return;
    }
    setIsLoading(true);
    setDevLink('');
    try {
      const res = await api.forgotPassword(email.trim());
      toast.success(res.message || 'Demande envoyée.');
      if (res.dev_reset_url) {
        setDevLink(res.dev_reset_url);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background p-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <img src="/logo-mj.svg" alt="MJ Studio" className="w-12 h-12 rounded-2xl mx-auto" />
            <h1 className="text-xl font-bold">Mot de passe oublié</h1>
            <p className="text-sm text-muted-foreground">
              Entrez votre email. En mode développement, le lien s'affiche ci-dessous.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
            >
              {isLoading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>

          {devLink && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-2">
              <p className="font-semibold flex items-center gap-1"><KeyRound size={14} /> Lien dev (MOCK) :</p>
              <Link
                to={devLink.includes('/reset-password') ? devLink.slice(devLink.indexOf('/reset-password')) : '/reset-password'}
                className="text-primary break-all underline"
              >
                Ouvrir la page de réinitialisation
              </Link>
            </div>
          )}

          <Link to="/login" className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </div>
      <footer className="py-4 text-center text-[11px] text-muted-foreground">MJ Studio — Mohamed Jerbi · 2026</footer>
    </div>
  );
}
