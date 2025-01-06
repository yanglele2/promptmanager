import React from 'react'
import type { ChatMessage } from '@/types/'
import { FiUser } from 'react-icons/fi'
import { RiRobot2Fill } from 'react-icons/ri'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface Props {
  message: ChatMessage
}

interface CodeProps {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export default function ChatMessageComponent({ message }: Props) {
  const isUser = message.role === 'user'

  const components: Components = {
    h2: ({node, ...props}) => <h2 className="text-xl font-bold my-4" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-bold my-3" {...props} />,
    p: ({node, ...props}) => <p className="my-2" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
    li: ({node, ...props}) => <li className="my-1" {...props} />,
    code: ({inline, className, children}: CodeProps) => 
      inline ? (
        <code className="bg-gray-100 rounded px-1">{children}</code>
      ) : (
        <code className="block bg-gray-100 rounded p-2 my-2 whitespace-pre-wrap">{children}</code>
      )
  }

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
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
} 