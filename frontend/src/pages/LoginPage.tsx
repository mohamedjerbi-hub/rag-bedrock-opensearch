import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { User, Lock, ArrowRight, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { getErrorMessage } from '../lib/utils';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (requires2FA) {
      if (!totpCode.trim() || totpCode.trim().length !== 6) {
        setError('Veuillez saisir un code 2FA à 6 chiffres.');
        return;
      }
      setIsLoading(true);
      try {
        const response = await api.login2FA({ temp_token: tempToken, code: totpCode.trim() });
        if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
        login(response.user, response.token);
        toast.success(`Bienvenue ${response.user.name} (2FA Validé)`);
        navigate('/chat');
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Code 2FA invalide.'));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError('Veuillez saisir votre email et mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.login({ email, password });
      if (response.requires_2fa) {
        setRequires2FA(true);
        setTempToken(response.temp_token);
        toast.success('Mot de passe valide. Entrez votre code 2FA.');
        setIsLoading(false);
        return;
      }

      if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken);
      login(response.user, response.token);
      toast.success(`Bienvenue ${response.user.name}`);
      navigate('/chat');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Identifiants incorrects.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background p-6">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo & Header */}
          <div className="text-center space-y-3">
            <img src="/logo-mj.svg" alt="MJ Studio Logo" className="w-12 h-12 rounded-2xl mx-auto shadow-sm" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {requires2FA ? 'Vérification 2FA' : 'Connexion MJ Studio'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {requires2FA
                  ? 'Saisissez le code à 6 chiffres de votre application 2FA.'
                  : 'Accédez à votre assistant RAG d\'entreprise (Smartovate).'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/30 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  <User size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                </div>

                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/30 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                </div>
              </>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/30 border-2 border-primary text-foreground text-center font-mono text-xl tracking-[0.4em] focus:outline-none transition-all"
                />
                <ShieldCheck size={18} className="absolute left-3.5 top-3.5 text-primary" />
              </div>
            )}

            {error && (
              <div className="text-xs text-error bg-error/10 rounded-xl px-3.5 py-2.5 border border-error/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {requires2FA ? <CheckCircle2 size={15} /> : <KeyRound size={15} />}
              {isLoading
                ? 'Connexion…'
                : requires2FA
                ? 'Valider le code 2FA'
                : 'Se connecter'}
            </button>

            {requires2FA && (
              <button
                type="button"
                onClick={() => { setRequires2FA(false); setError(''); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline pt-1"
              >
                ← Retour au mot de passe
              </button>
            )}
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
              S'inscrire <ArrowRight size={12} />
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] font-mono text-muted-foreground">
        MJ Studio — Mohamed Jerbi · ENI Carthage · 2026
      </footer>
    </div>
  );
}
