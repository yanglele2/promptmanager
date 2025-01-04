import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { toast } from 'react-hot-toast'
import { FiPlus, FiMessageSquare, FiTrash2, FiCheck } from 'react-icons/fi'
import type { Chat } from '@/types/'

export default function ChatList() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChats, setSelectedChats] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchChats()
  }, [])

  async function fetchChats() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setChats(data || [])
    } catch (error) {
      console.error('Error fetching chats:', error)
      toast.error('获取聊天记录失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedChats([])
  }

  const toggleSelection = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedChats(prev => 
      prev.length === chats.length ? [] : chats.map(chat => chat.id)
    )
  }

  const handleBatchDelete = async () => {
    if (!selectedChats.length) return
    
    if (!window.confirm(`确定要删除选中的 ${selectedChats.length} 个对话吗？`)) return

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .in('id', selectedChats)

      if (error) throw error

      setChats(prev => prev.filter(chat => !selectedChats.includes(chat.id)))
      setSelectedChats([])
      toast.success('批量删除成功')
    } catch (error) {
      console.error('Error batch deleting chats:', error)
      toast.error('批量删除失败')
    }
  }

  async function handleDelete(chatId: string) {
    if (!window.confirm('确定要删除这个聊天吗？')) return

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)

      if (error) throw error
      setChats(chats.filter(chat => chat.id !== chatId))
      toast.success('删除成功')
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast.error('删除失败')
    }
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">PromptChat</h1>
            <p className="mt-2 text-sm text-gray-700">
              查看和管理您的所有AI对话记录
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
            <button
              onClick={toggleSelectionMode}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isSelectionMode ? '退出选择' : '批量管理'}
            </button>
            
            <Link
              href="/chat/new"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto gap-2"
            >
              <FiPlus className="w-4 h-4" />
              新建对话
            </Link>
          </div>
        </div>

        {isSelectionMode && selectedChats.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                已选择 {selectedChats.length} 个对话
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {selectedChats.length === chats.length ? '取消全选' : '全选'}
              </button>
            </div>
            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <FiTrash2 className="w-4 h-4 mr-2" />
              删除选中
            </button>
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FiMessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无聊天记录</h3>
              <p className="mt-1 text-sm text-gray-500">开始您的第一个AI对话吧</p>
              <div className="mt-6">
                <Link
                  href="/chat/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FiPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  新建对话
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <div className="flex items-center px-4 py-4 sm:px-6 hover:bg-gray-50">
                      {isSelectionMode && (
                        <div className="mr-4">
                          <input
                            type="checkbox"
                            checked={selectedChats.includes(chat.id)}
                            onChange={() => toggleSelection(chat.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <Link href={`/chat/${chat.id}`} className="block">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {chat.title}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex">
                              {!isSelectionMode && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleDelete(chat.id)
                                  }}
                                  className="ml-2 text-gray-400 hover:text-gray-500"
                                >
                                  <FiTrash2 className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex">
                            <div className="flex items-center text-sm text-gray-500">
                              <span>
                                创建于 {new Date(chat.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
} 