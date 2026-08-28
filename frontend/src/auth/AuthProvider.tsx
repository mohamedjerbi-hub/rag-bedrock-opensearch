import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'auditor' | 'editor' | 'reader' | 'user';

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  totp_enabled?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('rag_auth_user');
      const savedToken = localStorage.getItem('jwtToken');
      if (savedUser && savedToken) setUser(JSON.parse(savedUser));
    } catch (_) {}
  }, []);

  const login = (newUser: AuthUser, token: string) => {
    setUser(newUser);
    localStorage.setItem('rag_auth_user', JSON.stringify(newUser));
    localStorage.setItem('jwtToken', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rag_auth_user');
    localStorage.removeItem('jwtToken');
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('rag_auth_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
