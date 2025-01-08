import React, { useState } from 'react'
import type { ChatMessage } from '@/types/'
import { FiUser } from 'react-icons/fi'
import { RiRobot2Fill } from 'react-icons/ri'
import { HiOutlineLightBulb } from 'react-icons/hi'
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
  const [showThinking, setShowThinking] = useState(false)
  const isUser = message.role === 'user'

  // 提取思维过程内容并清理原始标签
  const extractThinkingProcess = (content: string) => {
    // 移除 details 和 summary 标签，只保留 thinking 代码块内容
    const thinkingMatch = content.match(/```thinking\s*([\s\S]*?)\s*```/)
    if (thinkingMatch) {
      // 清理掉原始的 details 和 summary 标签
      const mainContent = content
        .replace(/<details>[\s\S]*?<\/details>/, '')
        .trim()
      return {
        thinking: thinkingMatch[1].trim(),
        mainContent
      }
    }
    return {
      thinking: '',
      mainContent: content
    }
  }

  const { thinking, mainContent } = extractThinkingProcess(message.content)

  const components: Components = {
    h2: ({node, ...props}) => <h2 className="text-xl font-bold my-4" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-bold my-3" {...props} />,
    p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-inside my-3 space-y-1" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-3 space-y-1" {...props} />,
    li: ({node, ...props}) => <li className="my-1" {...props} />,
    code: ({inline, className, children}: CodeProps) => 
      inline ? (
        <code className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-800 font-mono text-sm">{children}</code>
      ) : (
        <code className="block bg-gray-100 rounded-lg p-4 my-3 font-mono text-sm text-gray-800 overflow-x-auto">{children}</code>
      )
  }

  return (
    <div className={`flex gap-6 p-6 ${isUser ? 'bg-white shadow-sm rounded-lg' : 'bg-gray-50'}`}>
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
            <FiUser className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <RiRobot2Fill className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm text-gray-900">
            {isUser ? '你' : 'PromptChat'}
          </div>
          {!isUser && thinking && (
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <HiOutlineLightBulb className={`w-4 h-4 ${showThinking ? 'text-yellow-500' : ''}`} />
              <span>{showThinking ? '隐藏思考过程' : '查看思考过程'}</span>
            </button>
          )}
        </div>
        <div className="text-gray-700 prose prose-sm max-w-none">
          {thinking && showThinking && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="text-sm text-gray-600 mb-2 font-medium">思考过程：</div>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={components}
              >
                {thinking}
              </ReactMarkdown>
            </div>
          )}
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {mainContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
} 