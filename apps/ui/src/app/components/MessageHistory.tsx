import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useMessages } from '../contexts/MessageContext';
import { Button } from './ui/Button';

export default function MessageHistory() {
  const { 
    messages, 
    pagination, 
    isLoading, 
    fetchMessages, 
    setCurrentPage 
  } = useMessages();

  const { currentPage, totalPages } = pagination;

  // Fetch messages when component mounts or page changes
  useEffect(() => {
    fetchMessages(currentPage);
  }, [currentPage, fetchMessages]);

  // Safe date formatting function
  const formatDate = (timestamp: string | Date | undefined | null): string => {
    if (!timestamp) {
      return 'Unknown date';
    }
    
    try {
      let date: Date;
      
      // Handle string timestamps
      if (typeof timestamp === 'string') {
        // Try to parse ISO string
        date = parseISO(timestamp);
        
        // If that fails, try direct Date constructor
        if (!isValid(date)) {
          date = new Date(timestamp);
        }
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        return 'Invalid date';
      }
      
      // Check if date is valid
      if (!isValid(date)) {
        console.warn('Invalid date:', timestamp);
        return 'Invalid date';
      }
      
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Date formatting error:', error, 'for timestamp:', timestamp);
      return 'Invalid date';
    }
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-poly-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No messages signed yet. Start by signing your first message!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table for desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Message</th>
              <th className="py-3 px-3">Signer</th>
              <th className="py-3 px-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {messages.map((msg, index) => (
              <tr key={msg.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-2 px-3">
                  {msg.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </td>
                <td className="py-2 px-3">
                  <p className="text-sm truncate max-w-xs" title={msg.message}>
                    {msg.message}
                  </p>
                </td>
                <td className="py-2 px-3">
                  <p className="text-sm font-mono">
                    {msg.signer ? `${msg.signer.slice(0, 6)}...${msg.signer.slice(-4)}` : 'Unknown'}
                  </p>
                </td>
                <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(msg.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards for mobile */}
      <div className="sm:hidden space-y-2">
        {messages.map((msg, index) => (
          <div
            key={msg.id || index}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium truncate flex-1 mr-2">
                {msg.message}
              </p>
              {msg.valid ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="font-mono">
                {msg.signer ? `${msg.signer.slice(0, 6)}...${msg.signer.slice(-4)}` : 'Unknown'}
              </span>
              <span>{formatDate(msg.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || isLoading}
            size="sm"
            variant="ghost"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
            size="sm"
            variant="ghost"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}