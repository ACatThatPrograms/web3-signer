import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../lib/api';

// Type definition
interface Message {
  id: number;
  message: string;
  signature: string;
  signer: string;
  valid: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  messagesPerPage: number;
}

interface MessageContextType {
  messages: Message[];
  pagination: PaginationState;
  isLoading: boolean;
  fetchMessages: (page?: number) => Promise<void>;
  refreshMessages: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  addOptimisticMessage: (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

interface MessageProviderProps {
  children: ReactNode;
}

export function MessageProvider({ children }: MessageProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    messagesPerPage: 10,
  });

  // Fetch messages for a specific page
  const fetchMessages = useCallback(async (page?: number) => {
    const targetPage = page ?? pagination.currentPage;
    
    try {
      setIsLoading(true);
      const response = await api.post('/messages', {
        page: targetPage,
        limit: pagination.messagesPerPage,
      });

      if (response.data.success) {
        setMessages(response.data.messages || []);
        setPagination(prev => ({
          ...prev,
          currentPage: targetPage,
          totalPages: Math.ceil((response.data.total || 0) / prev.messagesPerPage),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.currentPage, pagination.messagesPerPage]);

  // Refresh messages (reload current page)
  const refreshMessages = useCallback(async () => {
    await fetchMessages(pagination.currentPage);
  }, [fetchMessages, pagination.currentPage]);

  // Set current page
  const setCurrentPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Add optimistic message (for immediate UI feedback)
  const addOptimisticMessage = useCallback((newMessage: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
    // If we're on the first page, add the message optimistically
    if (pagination.currentPage === 1) {
      const optimisticMessage: Message = {
        ...newMessage,
        id: Date.now(), // Temporary ID
        createdAt: new Date(),
      };
      
      setMessages(prev => [optimisticMessage, ...prev.slice(0, pagination.messagesPerPage - 1)]);
    }
    
    // Then fetch the latest messages to get the real data
    setTimeout(() => {
      refreshMessages();
    }, 500); // Small delay to ensure the backend has processed the message
  }, [pagination.currentPage, pagination.messagesPerPage, refreshMessages]);

  const value: MessageContextType = {
    messages,
    pagination,
    isLoading,
    fetchMessages,
    refreshMessages,
    setCurrentPage,
    addOptimisticMessage,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
}