import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import type { Prompt, Tag } from '@/types/index'

type PromptWithTags = Prompt & {
  prompt_tags?: Array<{
    tags: Tag
  }>
}

export default function EditPrompt() {
  const router = useRouter()
  const { id } = router.query
  const isNewPrompt = !id || id === 'new'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    language: '',
    purpose: '',
    tags: [] as string[]
  })

  useEffect(() => {
    if (id && !isNewPrompt) {
      fetchPrompt()
    } else {
      setLoading(false)
    }
  }, [id])

  const fetchPrompt = async () => {
    try {
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select(`
          *,
          prompt_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      const typedPrompt = prompt as PromptWithTags
      setFormData({
        title: typedPrompt.title,
        content: typedPrompt.content,
        description: typedPrompt.description || '',
        language: typedPrompt.language || '',
        purpose: typedPrompt.purpose || '',
        tags: typedPrompt.prompt_tags?.map(pt => pt.tags.name) || []
      })
    } catch (error) {
      console.error('Error fetching prompt:', error)
      toast.error('获取提示词失败')
    } finally {
      setLoading(false)
    }
  }

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

  const handleAutoDescription = async () => {
    if (!formData.title || !formData.content) {
      toast.error('请先填写标题和内容')
      return
    }

    setGeneratingDesc(true)
    try {
      const response = await fetch('/api/prompts/generate-description', {
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
        throw new Error(errorData.error || '生成描述失败')
      }

      const { description } = await response.json()
      setFormData(prev => ({
        ...prev,
        description
      }))
      toast.success('描述生成成功')
    } catch (error: any) {
      console.error('Error generating description:', error)
      toast.error(error.message || '生成描述失败')
    } finally {
      setGeneratingDesc(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const promptData = {
        title: formData.title,
        content: formData.content,
        description: formData.description || null,
        language: formData.language || null,
        purpose: formData.purpose || null,
        updated_at: new Date().toISOString(),
      }

      let promptId: string

      if (isNewPrompt) {
        // 1. 创建提示词
        const { data: newPrompt, error: createError } = await supabase
          .from('prompts')
          .insert({
            ...promptData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (createError) throw createError
        promptId = newPrompt.id
        toast.success('创建成功')
      } else {
        // 更新提示词
        const { error: updateError } = await supabase
          .from('prompts')
          .update(promptData)
          .eq('id', id)

        if (updateError) throw updateError
        promptId = id as string
        toast.success('更新成功')

        // 删除现有的标签关联
        const { error: deleteError } = await supabase
          .from('prompt_tags')
          .delete()
          .eq('prompt_id', promptId)

        if (deleteError) {
          console.error('删除现有标签关联失败:', deleteError)
        }
      }

      // 2. 处理标签
      if (formData.tags.length > 0) {
        // 2.1 创建或获取标签
        for (const tagName of formData.tags) {
          // 尝试创建标签（如果已存在则获取）
          const { data: tag, error: tagError } = await supabase
            .from('tags')
            .upsert({ name: tagName.trim() }, { onConflict: 'name' })
            .select()
            .single()

          if (tagError) {
            console.error('处理标签失败:', tagError)
            continue
          }

          // 2.2 创建提示词和标签的关联
          const { error: linkError } = await supabase
            .from('prompt_tags')
            .upsert({
              prompt_id: promptId,
              tag_id: tag.id
            }, {
              onConflict: 'prompt_id,tag_id'
            })

          if (linkError) {
            console.error('关联标签失败:', linkError)
          }
        }
      }

      router.push('/prompts')
    } catch (error: any) {
      console.error('Error saving prompt:', error)
      toast.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-4">加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isNewPrompt ? '新建提示词' : '编辑提示词'}
          </h1>
          <button
            onClick={() => router.push('/prompts')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            返回提示词库
          </button>
        </div>
        
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">描述</label>
              <button
                type="button"
                onClick={handleAutoDescription}
                disabled={generatingDesc}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {generatingDesc ? '生成中...' : '自动生成描述'}
              </button>
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
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

          {/* 操作按钮 */}
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