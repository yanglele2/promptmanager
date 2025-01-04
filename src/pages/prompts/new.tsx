import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import type { Tag, Folder } from '@/types/index'
import { toast } from 'react-hot-toast'

export default function NewPrompt() {
  const router = useRouter()
  const { data: session } = useSession()
  const { addPrompt } = useStore()
  const [saving, setSaving] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    language: '',
    purpose: '',
    tags: [] as string[]
  })
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')

  useEffect(() => {
    const fetchFolders = async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching folders:', error)
        return
      }

      setFolders(data || [])
    }

    fetchFolders()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
    setFormData(prev => ({
      ...prev,
      tags
    }))
  }

  const handleAutoTag = async () => {
    if (!formData.title || !formData.content) {
      toast.error('请先填写标题和内容')
      return
    }

    setAutoTagging(true)
    try {
      const response = await fetch('/api/prompts/generate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '生成标签失败')
      }

      const { tags } = await response.json()
      setFormData(prev => ({
        ...prev,
        tags
      }))
      toast.success('标签生成成功')
    } catch (error: any) {
      console.error('Error generating tags:', error)
      toast.error(error.message || '生成标签失败')
    } finally {
      setAutoTagging(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // 1. 创建提示词
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .insert({
          title: formData.title,
          content: formData.content,
          description: formData.description || null,
          language: formData.language || null,
          purpose: formData.purpose || null,
          user_id: session?.user?.id,
        })
        .select()
        .single()

      if (promptError) throw promptError

      // 如果选择了文件夹，创建关联
      if (selectedFolderId && promptData) {
        await supabase
          .from('prompt_folders')
          .insert({
            prompt_id: promptData.id,
            folder_id: selectedFolderId,
          })
      }

      // 2. 处理标签
      if (formData.tags.length > 0) {
        // 2.1 创建或获取标签
        for (const tagName of formData.tags) {
          try {
            // 尝试创建标签（如果已存在则获取）
            const { data: existingTag, error: findError } = await supabase
              .from('tags')
              .select()
              .eq('name', tagName.trim())
              .single()

            let tag
            if (!existingTag) {
              // 如果标签不存在，创建新标签
              const { data: newTag, error: createError } = await supabase
                .from('tags')
                .insert({
                  name: tagName.trim(),
                  user_id: session?.user?.id
                })
                .select()
                .single()

              if (createError) {
                console.error('创建标签失败:', createError)
                continue
              }
              tag = newTag
            } else {
              tag = existingTag
            }

            // 2.2 创建提示词和标签的关联
            const { error: linkError } = await supabase
              .from('prompt_tags')
              .insert({
                prompt_id: promptData.id,
                tag_id: tag.id
              })

            if (linkError) {
              console.error('关联标签失败:', linkError)
            }
          } catch (error) {
            console.error('处理标签失败:', error)
          }
        }
      }

      addPrompt(promptData)
      router.push('/prompts')
      toast.success('创建成功')
    } catch (error: any) {
      console.error('Error creating prompt:', error)
      toast.error(error.message || '创建提示词失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">新建提示词</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">标题</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">内容</label>
            <textarea
              name="content"
              required
              rows={5}
              value={formData.content}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">描述</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* 语言 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">语言</label>
            <input
              type="text"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* 用途 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">用途</label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* 标签管理 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">标签</label>
              <button
                type="button"
                onClick={handleAutoTag}
                disabled={autoTagging}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {autoTagging ? '生成中...' : '自动生成标签'}
              </button>
            </div>
            <textarea
              value={formData.tags.join(', ')}
              onChange={handleTagsChange}
              placeholder="输入标签，用逗号分隔"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={2}
            />
            <p className="mt-1 text-sm text-gray-500">
              多个标签请用逗号分隔，例如：AI, 编辑建议, 内容优化
            </p>
          </div>

          {/* 文件夹选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              选择文件夹（可选）
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">不选择文件夹</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
} 