import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { MessageSquare, FileText, BarChart3, Eye, PanelLeftClose, PanelLeft, LogOut, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarChatHistory from './SidebarChatHistory';
import { ThemeToggle } from './ThemeToggle';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isChat = location.pathname === '/chat';

  const navItems = [
    { to: '/chat', label: 'Chat', icon: MessageSquare, roles: ['admin', 'editor', 'reader', 'user', 'auditor'] },
    { to: '/documents', label: 'Documents', icon: FileText, roles: ['admin', 'editor'] },
    { to: '/admin', label: 'Dashboard', icon: BarChart3, roles: ['admin'] },
    { to: '/audit', label: 'Audit', icon: Eye, roles: ['admin', 'auditor'] },
  ].filter(item => user && item.roles.includes(user.role));

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'editor' ? 'Éditeur' : user?.role === 'auditor' ? 'Auditeur' : 'Lecteur';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col border-r border-border/60 bg-secondary/20 shrink-0 overflow-hidden"
          >
            <div className="w-[260px] h-full flex flex-col">
              {/* Logo MJ Studio Header */}
              <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/chat')}>
                  <img src="/logo-mj.svg" alt="MJ Studio Logo" className="w-7 h-7 rounded-lg shadow-sm" />
                  <div>
                    <h1 className="font-bold text-foreground tracking-tight text-sm leading-tight">MJ Studio</h1>
                    <p className="text-[10px] text-muted-foreground font-mono leading-none">RAG Engine</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 text-muted-foreground hover:bg-secondary rounded-md transition-colors"
                    title="Masquer le menu"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Middle Section (Chat History if on Chat, else empty space) */}
              <div className="flex-1 overflow-hidden">
                {isChat && <SidebarChatHistory />}
              </div>

              {/* Bottom section: App Nav & Profile + Footer */}
              <div className="p-3 border-t border-border/50 space-y-2 bg-background/50">
                <nav className="space-y-1 mb-1">
                  {navItems.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isActive
                            ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                        }`
                      }
                    >
                      <item.icon size={15} />
                      {item.label}
                    </NavLink>
                  ))}
                  <NavLink
                    to="/about"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      }`
                    }
                  >
                    <Info size={15} />
                    À propos
                  </NavLink>
                </nav>

                {/* User row */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/30 border border-border/40">
                  <NavLink
                    to="/profile"
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{roleLabel}</p>
                    </div>
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="p-1 rounded-md text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    title="Se déconnecter"
                  >
                    <LogOut size={14} />
                  </button>
                </div>

                {/* Footer Brand Line */}
                <p className="text-[10px] text-center font-mono text-muted-foreground pt-1 opacity-70">
                  MJ Studio — Mohamed Jerbi · 2026
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background">
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-3 left-3 z-50 p-1.5 bg-background border border-border shadow-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Afficher le menu"
          >
            <PanelLeft size={18} />
          </motion.button>
        )}

        <Outlet />
      </main>
    </div>
  );
}
