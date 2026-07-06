import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  hasRole: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
    } catch (error) {
      // Clear invalid credentials
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setToken(access_token);
    
    // Fetch profile details immediately after successful login
    const profileRes = await api.get('/auth/profile');
    setUser(profileRes.data);
  };

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken && token) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (e) {
        // Fallback if network fails
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  }, [token]);

  const register = async (email: string, password: string, fullName: string) => {
    await api.post('/auth/register', {
      email,
      password,
      full_name: fullName
    });
  };

  const hasRole = useCallback((allowedRoles: string[]) => {
    if (!user) return false;
    const userRoleNames = user.roles.map(r => r.name);
    if (userRoleNames.includes('Admin')) return true; // Admins bypass all guards
    return allowedRoles.some(role => userRoleNames.includes(role));
  }, [user]);

  // Sync token loading and listen to global auto-logout events
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    const handleAutoLogout = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth_logout', handleAutoLogout);
    return () => {
      window.removeEventListener('auth_logout', handleAutoLogout);
    };
  }, [token, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
