import React from 'react'
import type { ChatMessage } from '@/types/'
import { FiUser } from 'react-icons/fi'
import { RiRobot2Fill } from 'react-icons/ri'

interface Props {
  message: ChatMessage
}

export default function ChatMessageComponent({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 p-4 ${isUser ? 'bg-white' : 'bg-gray-50'}`}>
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <FiUser className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <RiRobot2Fill className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="font-medium text-sm text-gray-900">
          {isUser ? '你' : 'PromptChat'}
        </div>
        <div className="text-gray-700 prose max-w-none">
          {message.content}
        </div>
      </div>
    </div>
  )
} 