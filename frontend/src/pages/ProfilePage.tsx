import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../components/ThemeProvider';
import { ShieldCheck, User, Eye, Sun, Moon, Trash2, Save, Globe, QrCode, Lock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../api/client';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [language, setLanguage] = useState('fr');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(!!user?.totp_enabled);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading2FA, setIsLoading2FA] = useState(false);

  const roleLabel = user?.role === 'admin' ? 'Administrateur' : user?.role === 'editor' ? 'Éditeur' : 'Lecteur';
  const RoleIcon = user?.role === 'admin' ? ShieldCheck : user?.role === 'editor' ? User : Eye;
  const roleColor = user?.role === 'admin' ? 'text-primary bg-primary/10 border-primary/20' : user?.role === 'editor' ? 'text-accent bg-accent/10 border-accent/20' : 'text-muted-foreground bg-secondary border-border';

  const handleSave = () => {
    updateProfile({ name });
    toast.success('Profil mis à jour');
  };

  const handleDelete = async () => {
    if (deleteConfirm !== user?.email) return;
    try {
      await api.deleteMyAccount();
      toast.success('Compte supprimé');
      logout();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression.');
    }
  };

  const handleStart2FASetup = async () => {
    setIsLoading2FA(true);
    try {
      const data = await api.setup2FA();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setTotpSecret(data.secret);
      setIsSettingUp2FA(true);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'initialisation 2FA.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    if (!verifyCode || verifyCode.trim().length !== 6) {
      toast.error('Entrez un code à 6 chiffres.');
      return;
    }
    setIsLoading2FA(true);
    try {
      await api.verify2FA(verifyCode.trim());
      setTotpEnabled(true);
      setIsSettingUp2FA(false);
      setVerifyCode('');
      toast.success('Double authentification (2FA) activée avec succès !');
    } catch (e: any) {
      toast.error(e.message || 'Code 2FA incorrect.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verifyCode || verifyCode.trim().length !== 6) {
      toast.error('Entrez votre code 2FA actuel à 6 chiffres pour confirmer la désactivation.');
      return;
    }
    setIsLoading2FA(true);
    try {
      await api.disable2FA(verifyCode.trim());
      setTotpEnabled(false);
      setVerifyCode('');
      toast.success('La double authentification a été désactivée.');
    } catch (e: any) {
      toast.error(e.message || 'Code TOTP invalide.');
    } finally {
      setIsLoading2FA(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full pb-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">Mon profil</h1>

        <div className="space-y-6">
          {/* Informations générales */}
          <section className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/50 bg-secondary/20">
              <h2 className="font-semibold text-lg">Informations générales</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shadow-inner">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{user?.name}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mt-2 ${roleColor}`}>
                    <RoleIcon size={12} /> {roleLabel}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nom d'affichage</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/10 focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Adresse e-mail</label>
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/30 text-muted-foreground cursor-not-allowed text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save size={16} /> Sauvegarder
                </button>
              </div>
            </div>
          </section>

          {/* Sécurité & Double Authentification (2FA) */}
          <section className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="text-primary" size={20} />
                <h2 className="font-semibold text-lg">Sécurité & Double Authentification (2FA / TOTP)</h2>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${totpEnabled ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                {totpEnabled ? '🟢 2FA Activé' : '🟡 2FA Désactivé'}
              </span>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-muted-foreground">
                La double authentification ajoute une couche de sécurité supplémentaire en exigeant un code temporaire (TOTP) généré par une application mobile (Google Authenticator, Authy, Microsoft Authenticator).
              </p>

              {!totpEnabled && !isSettingUp2FA && (
                <button
                  onClick={handleStart2FASetup}
                  disabled={isLoading2FA}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm text-sm"
                >
                  <QrCode size={18} /> Activer la double authentification (2FA)
                </button>
              )}

              {/* 2FA Setup View */}
              <AnimatePresence>
                {isSettingUp2FA && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 border border-primary/20 bg-primary/5 rounded-2xl space-y-4"
                  >
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <QrCode className="text-primary" size={20} /> Étape 1 : Scannez le QR Code
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ouvrez votre application Google Authenticator ou Authy et scannez le code ci-dessous :
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-6 bg-background p-4 rounded-xl border border-border">
                      {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-40 h-40 object-contain rounded-lg border" />
                      ) : (
                        <div className="w-40 h-40 bg-secondary rounded-lg flex items-center justify-center text-xs text-muted-foreground">QR Code</div>
                      )}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Clé secrète manuelle :</p>
                        <code className="text-sm font-mono px-3 py-1.5 bg-secondary rounded-lg border inline-block text-primary font-bold tracking-widest select-all">
                          {totpSecret}
                        </code>
                        <p className="text-xs text-muted-foreground pt-1">
                          Entrez cette clé manuellement dans votre application si le scan est impossible.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="font-bold text-sm text-foreground mb-2">Étape 2 : Validez avec votre premier code à 6 chiffres</h4>
                      <div className="flex gap-3 max-w-sm">
                        <input
                          type="text"
                          maxLength={6}
                          value={verifyCode}
                          onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="flex-1 px-4 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={handleVerifyAndEnable2FA}
                          disabled={isLoading2FA}
                          className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-sm"
                        >
                          {isLoading2FA ? 'Vérification…' : 'Activer le 2FA'}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsSettingUp2FA(false)}
                      className="text-xs text-muted-foreground hover:underline pt-2 block"
                    >
                      Annuler la configuration
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2FA Disable View */}
              {totpEnabled && (
                <div className="p-4 border border-green-500/20 bg-green-500/5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                    <CheckCircle size={18} /> Votre compte est protégé par la double authentification.
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Pour désactiver le 2FA, entrez le code à 6 chiffres actuel :</p>
                    <div className="flex gap-3 max-w-sm">
                      <input
                        type="text"
                        maxLength={6}
                        value={verifyCode}
                        onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="flex-1 px-3 py-2 text-center text-base font-mono font-bold tracking-widest rounded-xl border border-border bg-background"
                      />
                      <button
                        onClick={handleDisable2FA}
                        disabled={isLoading2FA}
                        className="px-4 py-2 bg-error text-error-foreground font-semibold rounded-xl text-xs hover:bg-error/90 transition-all"
                      >
                        {isLoading2FA ? 'Désactivation…' : 'Désactiver 2FA'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Préférences */}
          <section className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/50 bg-secondary/20">
              <h2 className="font-semibold text-lg">Préférences de l'application</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Apparence</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border text-muted-foreground hover:bg-secondary/50'}`}
                    >
                      <Sun size={24} />
                      <span className="text-sm font-medium">Clair</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border text-muted-foreground hover:bg-secondary/50'}`}
                    >
                      <Moon size={24} />
                      <span className="text-sm font-medium">Sombre</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Langue de l'interface</label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/10 text-foreground appearance-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm"
                    >
                      <option value="fr">Français (FR)</option>
                      <option value="en">English (US)</option>
                    </select>
                    <Globe size={18} className="absolute right-4 top-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Zone de danger */}
          <section className="bg-background border border-error/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-error/20 bg-error/5">
              <h2 className="font-semibold text-lg text-error flex items-center gap-2">
                <Trash2 size={20} /> Zone de danger
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                La suppression de votre compte est définitive. Toutes vos données seront définitivement effacées.
              </p>
              {!isDeleting ? (
                <button
                  onClick={() => setIsDeleting(true)}
                  className="px-4 py-2 bg-error/10 text-error border border-error/20 rounded-xl text-sm font-medium hover:bg-error/20 transition-colors"
                >
                  Supprimer mon compte
                </button>
              ) : (
                <div className="p-4 bg-secondary/20 rounded-xl border border-border space-y-3">
                  <p className="text-xs font-semibold text-foreground">
                    Confirmez en saisissant votre adresse e-mail ({user?.email}) :
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={user?.email}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirm !== user?.email}
                      className="px-3 py-1.5 bg-error text-error-foreground rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      Confirmer la suppression
                    </button>
                    <button
                      onClick={() => { setIsDeleting(false); setDeleteConfirm(''); }}
                      className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
