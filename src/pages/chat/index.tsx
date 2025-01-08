import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import type { Chat } from '@/types/'
import ChatListItem from '@/components/ChatListItem'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/router'
import { HiPlus } from 'react-icons/hi'

export default function ChatList() {
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchChats()
  }, [])

  async function fetchChats() {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setChats(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching chats:', error)
      toast.error('获取对话列表失败')
      setLoading(false)
    }
  }

  const createNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([
          { title: '新对话' }
        ])
        .select()
        .single()

      if (error) throw error

      if (data) {
        router.push(`/chat/${data.id}`)
      }
    } catch (error) {
      console.error('Error creating new chat:', error)
      toast.error('创建对话失败')
    }
  }

  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode)
    setSelectedChats(new Set())
  }

  const handleSelect = (chatId: string) => {
    const newSelected = new Set(selectedChats)
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId)
    } else {
      newSelected.add(chatId)
    }
    setSelectedChats(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedChats.size === 0) return

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .in('id', Array.from(selectedChats))

      if (error) throw error

      toast.success('删除成功')
      fetchChats()
      setSelectedChats(new Set())
      setIsBatchMode(false)
    } catch (error) {
      console.error('Error deleting chats:', error)
      toast.error('删除失败')
    }
  }

  const handleSelectAll = () => {
    if (selectedChats.size === chats.length) {
      setSelectedChats(new Set())
    } else {
      setSelectedChats(new Set(chats.map(chat => chat.id)))
    }
  }

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* 头部 */}
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">对话列表</h1>
            {isBatchMode && selectedChats.size > 0 && (
              <span className="text-sm text-gray-500">
                已选择 {selectedChats.size} 个对话
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleBatchMode}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${isBatchMode 
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {isBatchMode ? '取消' : '批量管理'}
            </button>
            {!isBatchMode && (
              <button
                onClick={createNewChat}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm hover:shadow"
              >
                <HiPlus className="w-4 h-4" />
                <span>新对话</span>
              </button>
            )}
            {isBatchMode && (
              <>
                <button
                  onClick={handleSelectAll}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${selectedChats.size === chats.length
                      ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {selectedChats.size === chats.length ? '取消全选' : '全选'}
                </button>
                {selectedChats.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    删除选中
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 列表区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                <svg
                  className="w-16 h-16 text-gray-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-base">暂无对话</p>
                <p className="text-sm text-gray-400 mt-2">开始一个新的对话吧</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 bg-white shadow-sm rounded-lg my-6 mx-6">
                {chats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isBatchMode={isBatchMode}
                    isSelected={selectedChats.has(chat.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
} 