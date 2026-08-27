import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PrivacyNotice } from './components/PrivacyNotice';
import { Chatbot } from './components/Chatbot';

import { Login } from './pages/Login';
import { LiveEmotion } from './pages/LiveEmotion';
import { UploadImage } from './pages/UploadImage';
import { Dashboard } from './pages/Dashboard';
import { SessionDetail } from './pages/SessionDetail';
import { DomainEducation } from './pages/DomainEducation';
import { DomainHealthcare } from './pages/DomainHealthcare';
import { DomainCustomer } from './pages/DomainCustomer';
import { Profile } from './pages/Profile';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-sm space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <div>Initializing EmoSense AI System...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      <Navbar 
        onOpenPrivacy={() => setIsPrivacyOpen(true)} 
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex flex-1">
        <Sidebar 
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <PrivacyNotice isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <Chatbot />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<MainLayout><Navigate to="/dashboard" replace /></MainLayout>} />
            <Route path="/live" element={<MainLayout><LiveEmotion /></MainLayout>} />
            <Route path="/upload" element={<MainLayout><UploadImage /></MainLayout>} />
            <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
            <Route path="/session/:id" element={<MainLayout><SessionDetail /></MainLayout>} />
            <Route path="/sessions/:id" element={<MainLayout><SessionDetail /></MainLayout>} />
            
            <Route path="/domain/education" element={<MainLayout><DomainEducation /></MainLayout>} />
            <Route path="/domain/healthcare" element={<MainLayout><DomainHealthcare /></MainLayout>} />
            <Route path="/domain/customer" element={<MainLayout><DomainCustomer /></MainLayout>} />
            
            <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
