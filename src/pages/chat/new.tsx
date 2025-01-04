import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { toast } from 'react-hot-toast'

export default function NewChat() {
  const router = useRouter()
  const content = router.query.content as string | undefined
  const isCreating = useRef(false)
  const hasCreated = useRef(false)

  useEffect(() => {
    const createChat = async () => {
      if (hasCreated.current || isCreating.current) return
      
      try {
        isCreating.current = true
        hasCreated.current = true
        
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert([{
            title: '新对话',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (chatError) {
          console.error('创建聊天失败:', chatError)
          toast.error('创建聊天失败')
          return
        }

        if (chat) {
          await router.replace(`/chat/${chat.id}${content ? `?content=${encodeURIComponent(content)}` : ''}`)
        }
      } catch (error) {
        console.error('创建聊天失败:', error)
        toast.error('创建聊天失败')
        hasCreated.current = false
      } finally {
        isCreating.current = false
      }
    }

    if (router.isReady) {
      createChat()
    }
  }, [content])

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在创建新对话...</p>
        </div>
      </div>
    </Layout>
  )
} 