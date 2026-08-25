import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithDemo: (role?: UserRole, name?: string) => Promise<void>;
  loginWithGoogle: (
    authData: string | { token?: string; credential?: string; accessToken?: string; email?: string; name?: string; googleId?: string; role?: UserRole },
    role?: UserRole
  ) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('emosense_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        localStorage.removeItem('emosense_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  /* ── Register (email/password → MongoDB only, no auto-login) ── */
  const register = async (name: string, email: string, password: string, role: UserRole) => {
    // Just hit the API to save to MongoDB — don't set user/token yet
    // The user will manually sign in after registration
    const res = await api.post('/auth/register', { name, email, password, role });
    if (!res.data?.token) throw new Error('Registration failed — no token returned');
    // Return the saved user data for confirmation but DON'T log them in automatically
    return res.data;
  };

  /* ── Login with email + password (MongoDB) ── */
  const loginWithPassword = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('emosense_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ── Demo login (legacy) ── */
  const loginWithDemo = async (role: UserRole = 'student', name?: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/demo', { role, name });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('emosense_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth ── */
  const loginWithGoogle = async (
    authData: string | { token?: string; credential?: string; accessToken?: string; email?: string; name?: string; googleId?: string; role?: UserRole },
    role: UserRole = 'student'
  ) => {
    setLoading(true);
    try {
      const payload = typeof authData === 'string'
        ? { token: authData, role }
        : { role: authData.role || role, ...authData };
      const res = await api.post('/auth/google', payload);
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('emosense_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('emosense_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedUser: Partial<User>) => {
    try {
      const res = await api.put('/auth/profile', updatedUser);
      setUser(res.data.user);
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, loginWithPassword, loginWithDemo, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
