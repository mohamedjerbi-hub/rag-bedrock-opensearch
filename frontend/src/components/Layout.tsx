import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { MessageSquare, FileText, BarChart3, Eye, PanelLeftClose, PanelLeft, LogOut, AlertCircle, Menu, X } from 'lucide-react';
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
    { to: '/admin/signalements', label: 'Signalements', icon: AlertCircle, roles: ['admin', 'editor'] },
    { to: '/admin', label: 'Dashboard', icon: BarChart3, roles: ['admin'] },
    { to: '/audit', label: 'Audit', icon: Eye, roles: ['admin', 'auditor'] },
  ].filter(item => user && item.roles.includes(user.role));

  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'editor' ? 'Éditeur' : user?.role === 'auditor' ? 'Auditeur' : 'Lecteur';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Mobile Top Header (screen width < 768px) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/chat')}>
          <img src="/logo-mj.svg" alt="Logo" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-sm tracking-tight text-foreground">MJ Studio RAG</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-secondary text-foreground border border-border"
            aria-label="Toggle navigation"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay on Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed md:static inset-y-0 left-0 z-50 w-[270px] flex flex-col border-r border-border bg-card shrink-0 overflow-hidden shadow-xl md:shadow-none"
          >
            <div className="w-full h-full flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-border">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/chat')}>
                  <img src="/logo-mj.svg" alt="MJ Studio Logo" className="w-8 h-8 rounded-lg" />
                  <div>
                    <h1 className="font-bold text-foreground text-sm tracking-tight leading-tight">MJ Studio</h1>
                    <p className="text-[11px] text-muted-foreground font-mono leading-none mt-0.5">RAG Enterprise</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-1">
                  <ThemeToggle />
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    title="Masquer le menu"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Middle Section */}
              <div className="flex-1 overflow-hidden">
                {isChat && <SidebarChatHistory />}
              </div>

              {/* Bottom section: App Nav & Profile */}
              <div className="p-4 border-t border-border space-y-3 bg-muted/20">
                <nav className="space-y-1">
                  {navItems.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`
                      }
                    >
                      <item.icon size={17} />
                      {item.label}
                    </NavLink>
                  ))}
                </nav>

                {/* User Row */}
                <div className="flex items-center gap-2 p-2 min-h-[44px] rounded-xl bg-secondary/50 border border-border">
                  <NavLink
                    to="/profile"
                    onClick={() => {
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{roleLabel}</p>
                    </div>
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    title="Se déconnecter"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

                <p className="text-[10px] text-center font-mono text-muted-foreground pt-1">
                  MJ Studio RAG Platform 2026
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-background pt-14 md:pt-0">
        {!isSidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex absolute top-3 left-3 z-30 w-11 h-11 items-center justify-center bg-card border border-border shadow-sm rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
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
