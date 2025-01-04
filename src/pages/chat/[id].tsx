import { useEffect, useState, useRef, useCallback } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import type { Chat, ChatMessage } from '@/types/'
import { useRouter } from 'next/router'
import { toast } from 'react-hot-toast'
import ChatMessageComponent from '@/components/ChatMessage'
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi'

export default function ChatDetail() {
  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { id } = router.query
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')

  useEffect(() => {
    if (id) {
      fetchChat()
      fetchMessages()
    }
  }, [id])

  // 单独处理初始消息
  useEffect(() => {
    const initialMessage = router.query.initial_message as string
    if (initialMessage && !loading) {
      setNewMessage(initialMessage)
    }
  }, [loading, router.query.initial_message])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // 如果URL中有content参数，则设置到输入框中
    if (router.query.content) {
      setNewMessage(decodeURIComponent(router.query.content as string))
    }
  }, [router.query.content])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchChat() {
    try {
      if (!id) return

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setChat(data)
    } catch (error) {
      console.error('Error fetching chat:', error)
      toast.error('获取聊天失败')
    }
  }

  async function fetchMessages() {
    try {
      if (!id) return

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('获取消息失败')
      setLoading(false)
    }
  }

  // 自动生成标题的函数
  const generateTitle = useCallback(async (content: string) => {
    try {
      const response = await fetch('/api/chat/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      })

      if (!response.ok) throw new Error('生成标题失败')
      
      const { title } = await response.json()
      return title
    } catch (error) {
      console.error('Error generating title:', error)
      return '新对话'
    }
  }, [])

  // 更新标题的函数
  const updateTitle = async (newTitle: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle })
        .eq('id', id)

      if (error) throw error
      
      setChat(prev => prev ? { ...prev, title: newTitle } : null)
      toast.success('标题已更新')
    } catch (error) {
      console.error('Error updating title:', error)
      toast.error('更新标题失败')
    }
  }

  // 处理手动编辑标题
  const handleEditTitle = () => {
    setEditedTitle(chat?.title || '')
    setIsEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return
    await updateTitle(editedTitle.trim())
    setIsEditingTitle(false)
  }

  const handleCancelEdit = () => {
    setIsEditingTitle(false)
    setEditedTitle('')
  }

  // 在发送消息后自动更新标题
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !id) return

    try {
      setSending(true)

      // 添加用户消息
      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: id,
          role: 'user',
          content: newMessage
        })

      if (userMessageError) throw userMessageError

      // 更新消息列表
      const userMessage = {
        id: 'temp-user-msg',
        chat_id: id as string,
        role: 'user' as const,
        content: newMessage,
        created_at: new Date().toISOString()
      }
      
      setMessages(prevMessages => [...prevMessages, userMessage])
      setNewMessage('')

      // 如果是第一条消息，根据内容生成标题
      if (messages.length === 0) {
        const generatedTitle = await generateTitle(newMessage)
        await updateTitle(generatedTitle)
      }

      // 调用 AI API 获取回复
      try {
        const response = await fetch('/api/chat/completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messages.concat(userMessage).map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        })

        if (!response.ok) {
          throw new Error('API request failed')
        }

        const data = await response.json()
        
        // 保存 AI 回复到数据库
        const { error: aiMessageError } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: id,
            role: 'assistant',
            content: data.response
          })

        if (aiMessageError) throw aiMessageError

        // 更新消息列表
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: 'temp-ai-msg',
            chat_id: id as string,
            role: 'assistant',
            content: data.response,
            created_at: new Date().toISOString()
          }
        ])
      } catch (error) {
        console.error('Error getting AI response:', error)
        toast.error('获取 AI 回复失败')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('发送消息失败')
    } finally {
      setSending(false)
    }
  }

  if (!id) return null

  return (
    <Layout>
      <div className="flex flex-col h-screen">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-4 flex-1">
            {/* 返回按钮 */}
            <button
              onClick={() => router.push('/chat')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              返回列表
            </button>

            {/* 标题编辑区域 */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入对话标题"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 text-green-600 hover:text-green-700"
                >
                  <FiCheck className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-600 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  {chat?.title || '新对话'}
                </h1>
                <button
                  onClick={handleEditTitle}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessageComponent key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* 输入框 */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="输入消息..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {sending ? '发送中...' : '发送'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
} 