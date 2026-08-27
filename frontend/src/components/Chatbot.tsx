import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { soundManager } from '../utils/audioFeedback';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  Minimize2, 
  Maximize2, 
  RefreshCw, 
  Trash2, 
  HelpCircle,
  BrainCircuit,
  GraduationCap,
  Stethoscope,
  Headphones
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

interface ChatbotProps {
  activeEmotion?: string;
  activeContext?: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ activeEmotion, activeContext }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting based on user role when opened first time
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: 'welcome-1',
        sender: 'ai',
        text: `Hello ${user?.name || user?.email || 'there'}! I am **EmoSense AI**, your affective intelligence co-pilot. I can explain live facial emotions, analyze telemetry trends, and provide tailored domain recommendations in simple language.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Explain my current emotion',
          'How does facial recognition work?',
          'Classroom confusion advice',
          'Customer de-escalation tips',
          'Therapeutic mood metrics'
        ]
      };
      setMessages([initialGreeting]);
    }
  }, [user]);

  // Auto-scroll to bottom of message list
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input.trim();
    if (!messageText || loading) return;

    soundManager.playBlip(600, 50);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/emotions/chat', { 
        message: messageText,
        context: activeContext || 'education',
        activeEmotion: activeEmotion || 'neutral'
      });

      soundManager.playSuccessChime();

      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.data.reply || "I have analyzed your request based on current emotion telemetry.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.data.suggestions || []
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      console.error('Chatbot API error:', err);
      const errorReply: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        sender: 'ai',
        text: "I experienced a brief connection interruption. Please ensure the backend server is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Retry question', 'Check system health']
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Chat session refreshed. How can I assist with emotion recognition or dashboard insights?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Explain my current emotion', 'What is Valence & Arousal?', 'Export printable report']
      }
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            soundManager.playBlip(700, 60);
            setIsOpen(true);
          }}
          className="group flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-indigo-600/40 hover:scale-105 transition-all duration-300 border border-white/20"
          title="Open EmoSense AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <span className="font-bold text-sm tracking-wide hidden sm:inline">Ask AI Co-Pilot</span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`w-full sm:w-[420px] glass-panel rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized ? 'h-16' : 'h-[560px]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">EmoSense AI Co-Pilot</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Online • Affective Explainer</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Clear Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={isMinimized ? "Expand Chat" : "Minimize Chat"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area (Hidden when minimized) */}
          {!isMinimized && (
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-start gap-2.5 max-w-[88%]">
                      {msg.sender === 'ai' && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                      )}

                      <div>
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-md shadow-indigo-600/20 font-medium'
                              : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block px-1">
                          {msg.timestamp}
                        </span>
                      </div>

                      {msg.sender === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-300 font-bold text-[10px]">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Quick Suggestion Chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-9 max-w-[88%]">
                        {msg.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(suggestion)}
                            className="px-2.5 py-1 rounded-full text-[11px] bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/50 transition-all hover:scale-102 flex items-center gap-1 font-medium"
                          >
                            <span>{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs ml-9">
                    <div className="flex items-center gap-1 p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px]">EmoSense AI is formulating insight...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2">
                <input
                  id="chatbot-input"
                  name="chatbot-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask EmoSense AI to explain emotions or stats..."
                  disabled={loading}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 hover:opacity-90 disabled:opacity-40 transition"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
