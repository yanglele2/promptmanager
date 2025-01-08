import React from 'react';
import { useRouter } from 'next/router';
import type { Chat } from '@/types/';

interface ChatListItemProps {
  chat: Chat;
  isSelected?: boolean;
  isBatchMode?: boolean;
  onSelect?: (chatId: string) => void;
}

export default function ChatListItem({ 
  chat, 
  isSelected = false, 
  isBatchMode = false,
  onSelect 
}: ChatListItemProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (isBatchMode) {
      e.preventDefault();
      onSelect?.(chat.id);
    } else {
      router.push(`/chat/${chat.id}`);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        relative flex items-center px-6 py-4 cursor-pointer
        ${isBatchMode ? 'hover:bg-yellow-50' : 'hover:bg-gray-50'}
        ${isSelected ? 'bg-yellow-50 shadow-sm' : ''}
        transition-all duration-200 group
      `}
    >
      {isBatchMode && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(chat.id)}
            className="w-5 h-5 rounded-md border-2 border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      <div className={`flex-1 min-w-0 ${isBatchMode ? 'pl-10' : ''}`}>
        <div className="flex justify-between items-center gap-4">
          <h3 className={`font-medium truncate ${
            isSelected ? 'text-purple-900' : 'text-gray-900'
          } group-hover:text-purple-700 transition-colors`}>
            {chat.title || '新对话'}
          </h3>
          <span className="flex-shrink-0 text-xs text-gray-400">
            {new Date(chat.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
} 