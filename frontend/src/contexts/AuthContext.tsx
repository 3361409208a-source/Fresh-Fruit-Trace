import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser, Enterprise, UserRole } from '../types';
import * as api from '../api';

interface AuthContextType {
  user: AuthUser | null;
  enterprise: Enterprise | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (username: string, password: string, enterprise_code?: string) => Promise<void>;
  register: (data: { enterprise_name: string; enterprise_code: string; username: string; password: string; real_name?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (): Promise<boolean> => {
    const token = api.getToken();
    if (!token) {
      setIsLoading(false);
      return false;
    }

    try {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setUser(res.data.user);
        setEnterprise(res.data.enterprise);
        setIsLoading(false);
        return true;
      }
    } catch {
      api.removeToken();
    }
    setIsLoading(false);
    return false;
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, password: string, enterprise_code?: string) => {
    const res = await api.login(username, password, enterprise_code);
    if (!res.success || !res.data) {
      throw new Error(res.message || '登录失败');
    }
    api.setToken(res.data.token);
    setUser(res.data.user);
    setEnterprise(res.data.enterprise);
  };

  const register = async (data: { enterprise_name: string; enterprise_code: string; username: string; password: string; real_name?: string; phone?: string }) => {
    const res = await api.register(data);
    if (!res.success || !res.data) {
      throw new Error(res.message || '注册失败');
    }
    api.setToken(res.data.token);
    setUser(res.data.user);
    setEnterprise(res.data.enterprise);
  };

  const logout = () => {
    api.removeToken();
    setUser(null);
    setEnterprise(null);
    window.location.href = '/login';
  };

  const role = user?.role || null;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'super_admin' || role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        enterprise,
        isLoading,
        isAuthenticated,
        role,
        isSuperAdmin,
        isAdmin,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
