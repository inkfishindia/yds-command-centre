
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  isLoading: boolean;
  isChatOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isMockMode } = useAuth();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  // Initialize Gemini
  useEffect(() => {
    if (isSignedIn || isMockMode) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const session = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: 'You are Nexus AI, a highly capable strategic business assistant. You help founders and managers with data analysis, task management, and strategic planning. Be professional, insightful, and concise.',
          },
        });
        setChatSession(session);
      } catch (error) {
        console.error('Failed to initialize Gemini:', error);
      }
    }
  }, [isSignedIn, isMockMode]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !chatSession) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await chatSession.sendMessage({ message: content });
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'I am sorry, I could not generate a response.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('Gemini Error:', error);
      addToast(`AI Error: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [chatSession, addToast]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    // Re-initialize session to clear history
    if (isSignedIn || isMockMode) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const session = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: 'You are Nexus AI, a highly capable strategic business assistant. You help founders and managers with data analysis, task management, and strategic planning. Be professional, insightful, and concise.',
        },
      });
      setChatSession(session);
    }
  }, [isSignedIn, isMockMode]);

  const toggleChat = () => setIsChatOpen(prev => !prev);
  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <ChatContext.Provider value={{
      messages,
      sendMessage,
      clearMessages,
      isLoading,
      isChatOpen,
      toggleChat,
      openChat,
      closeChat,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
