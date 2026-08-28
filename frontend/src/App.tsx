import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ChatProvider } from './contexts/ChatContext';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { SkeletonTable } from './components/Skeleton';
import type { UserRole } from './auth/AuthProvider';

// Route Code Splitting for optimal bundle performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const GapManagementPage = lazy(() => import('./pages/GapManagementPage'));

function PageLoader() {
  return (
    <div className="p-8 h-full w-full flex flex-col justify-center items-center">
      <SkeletonTable rows={6} />
    </div>
  );
}

function Guard({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/chat" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'bg-background text-foreground border border-border shadow-md',
          duration: 4000,
          style: {
            background: 'var(--background)',
            color: 'var(--foreground)',
          }
        }}
      />
      <ChatProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/app" element={<Navigate to="/chat" replace />} />
              <Route path="/" element={<Guard><Layout /></Guard>}>
                <Route path="chat" element={<ChatPage />} />
                <Route path="documents" element={<Guard roles={['admin', 'editor']}><DocumentsPage /></Guard>} />
                <Route path="admin" element={<Guard roles={['admin']}><AdminPage /></Guard>} />
                <Route path="admin/signalements" element={<Guard roles={['admin', 'editor']}><GapManagementPage /></Guard>} />
                <Route path="audit" element={<Guard roles={['admin', 'auditor']}><AuditPage /></Guard>} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ChatProvider>
    </AuthProvider>
  );
}
