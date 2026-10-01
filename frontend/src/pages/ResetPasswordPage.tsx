import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Lien invalide (token manquant).');
      return;
    }
    if (password.length < 8) {
      toast.error('Minimum 8 caractères.');
      return;
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsLoading(true);
    try {
      await api.resetPassword(token, password);
      toast.success('Mot de passe mis à jour !');
      navigate('/login');
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
            <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary transition-all"
                required
                minLength={8}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmer"
                className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-xs disabled:opacity-50 hover:bg-primary/90 transition-all shadow-sm"
            >
              {isLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>

          <Link to="/login" className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Connexion
          </Link>
        </div>
      </div>
      <footer className="py-4 text-center text-[11px] text-muted-foreground">MJ Studio — Mohamed Jerbi · 2026</footer>
    </div>
  );
}
