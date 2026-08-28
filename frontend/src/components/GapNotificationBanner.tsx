import { AlertTriangle, PlusCircle } from 'lucide-react';

interface GapNotificationBannerProps {
  onOpenReportModal: () => void;
  message?: string;
}

export default function GapNotificationBanner({
  onOpenReportModal,
  message = "Je n'ai pas trouvé cette information dans la base documentaire. Vous pouvez la signaler à l'équipe pour qu'elle soit ajoutée."
}: GapNotificationBannerProps) {
  return (
    <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fadeIn">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90 font-medium leading-relaxed">
          {message}
        </p>
      </div>

      <button
        onClick={onOpenReportModal}
        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
      >
        <PlusCircle size={14} /> Signaler un manque d'information
      </button>
    </div>
  );
}
