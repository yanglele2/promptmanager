import { useEffect, useState, useRef, useCallback } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import type { Chat, ChatMessage } from '@/types/'
import { useRouter } from 'next/router'
import { toast } from 'react-hot-toast'
import ChatMessageComponent from '@/components/ChatMessage'
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi'
import ChatStatus from '@/components/ChatStatus'

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

  const handleRewriteWithContent = async (messageId: string, newContent: string) => {
    try {
      const messageToRewrite = messages.find(m => m.id === messageId)
      if (!messageToRewrite) return

      setSending(true)

      // 获取完整的对话上下文
      const messageIndex = messages.findIndex(m => m.id === messageId)
      const contextMessages = messages.slice(0, messageIndex + 1).map(m => ({
        role: m.role,
        content: m.id === messageId ? newContent : m.content
      }))

      // 更新用户消息
      const { error: updateError } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId)

      if (updateError) throw updateError

      // 更新本地状态
      const updatedMessages = messages.map(m => 
        m.id === messageId ? { ...m, content: newContent } : m
      )
      setMessages(updatedMessages)

      // 获取新的 AI 回复
      const response = await fetch('/api/chat/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: contextMessages })
      })

      if (!response.ok) throw new Error('Failed to get completion')
      
      const { response: aiResponse } = await response.json()

      // 找到当前消息后的第一个 AI 回复
      const nextAiMessage = messages
        .slice(messageIndex + 1)
        .find(m => m.role === 'assistant')

      if (nextAiMessage) {
        // 更新 AI 回复
        const { error: aiUpdateError } = await supabase
          .from('messages')
          .update({ content: aiResponse })
          .eq('id', nextAiMessage.id)

        if (aiUpdateError) throw aiUpdateError

        // 更新本地状态
        setMessages(prevMessages => 
          prevMessages.map(m => 
            m.id === nextAiMessage.id ? { ...m, content: aiResponse } : m
          )
        )
      } else {
        // 如果没有找到下一条 AI 消息，创建新的回复
        const { data: newMessage, error: insertError } = await supabase
          .from('messages')
          .insert([
            {
              chat_id: id,
              role: 'assistant',
              content: aiResponse
            }
          ])
          .select()
          .single()

        if (insertError) throw insertError

        // 更新本地状态
        setMessages(prevMessages => [...prevMessages, newMessage])
      }

      toast.success('内容已更新')
    } catch (error) {
      console.error('Error updating content:', error)
      toast.error('更新内容失败')
    } finally {
      setSending(false)
    }
  }

  // 同样修改 handleRewriteMessage 函数
  const handleRewriteMessage = async (messageId: string) => {
    try {
      const messageToRewrite = messages.find(m => m.id === messageId)
      if (!messageToRewrite) return

      setSending(true)

      // 获取完整的对话上下文
      const messageIndex = messages.findIndex(m => m.id === messageId)
      const contextMessages = messages.slice(0, messageIndex).map(m => ({
        role: m.role,
        content: m.content
      }))

      // 发送请求重新生成回复
      const response = await fetch('/api/chat/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: contextMessages })
      })

      if (!response.ok) throw new Error('Failed to get completion')
      
      const { response: newContent } = await response.json()

      // 更新数据库
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId)

      if (error) throw error

      // 更新本地状态
      setMessages(prevMessages => 
        prevMessages.map(m => 
          m.id === messageId ? { ...m, content: newContent } : m
        )
      )

      toast.success('回复已重新生成')
    } catch (error) {
      console.error('Error rewriting message:', error)
      toast.error('重新生成回复失败')
    } finally {
      setSending(false)
    }
  }

  if (!id) return null

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-screen-xl mx-auto w-full">
            {/* 返回按钮 */}
            <button
              onClick={() => router.push('/chat')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
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
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="输入对话标题"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 text-green-600 hover:text-green-700 transition-colors"
                >
                  <FiCheck className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:text-gray-700 transition-colors"
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
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto w-full">
            <div className="space-y-6 py-6 px-4 sm:px-6">
              {messages.map((message, index) => (
                <ChatMessageComponent
                  key={message.id || index}
                  message={message}
                />
              ))}
              
              {/* 添加状态指示器 */}
              <ChatStatus sending={sending} />
            </div>
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="border-t bg-white shadow-sm">
          <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-4">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                disabled={sending}
                className={`w-full px-6 py-3 pr-24 rounded-xl border ${
                  sending ? 'bg-gray-50' : 'bg-white'
                } focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm text-base`}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  sending || !newMessage.trim()
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md'
                }`}
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