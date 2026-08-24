import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('emosense_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
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

  const loginWithDemo = async (role: UserRole = 'student', name?: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/demo', { role, name });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('emosense_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      console.error('Demo login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Google login failed:', err);
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
      console.error('Failed to update user profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithDemo, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
