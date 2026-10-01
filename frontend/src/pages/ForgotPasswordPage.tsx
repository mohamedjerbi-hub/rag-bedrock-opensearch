import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Entrez votre email.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      toast.success(res.message || 'Demande envoyée.');
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
              Entrez votre adresse email. Un lien de réinitialisation vous sera envoyé.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-xs disabled:opacity-50 hover:bg-primary/90 transition-all shadow-sm"
            >
              {isLoading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>

          <Link to="/login" className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </div>
      <footer className="py-4 text-center text-[11px] text-muted-foreground">MJ Studio — Mohamed Jerbi · 2026</footer>
    </div>
  );
}
