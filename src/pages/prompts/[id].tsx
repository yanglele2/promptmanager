import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { FiSave, FiTag, FiArrowLeft, FiRefreshCw, FiEdit3, FiAlignLeft, FiInfo, FiCode, FiTarget } from 'react-icons/fi'
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 顶部导航栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/prompts')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none transition-colors duration-200"
              >
                <FiArrowLeft className="h-5 w-5 mr-1" />
                返回提示词库
              </button>
            </div>
            <button
              type="submit"
              form="prompt-form"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 text-sm font-medium rounded-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none shadow-lg shadow-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存提示词'}
            </button>
          </div>

          {/* 标题区域 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {isNewPrompt ? '创建新的提示词' : '编辑提示词'}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              编写高质量的提示词，帮助 AI 更好地理解和执行任务
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <FiRefreshCw className="animate-spin h-5 w-5 text-indigo-500" />
                <span className="text-gray-600">加载中...</span>
              </div>
            </div>
          ) : (
            <form id="prompt-form" onSubmit={handleSubmit} className="space-y-6">
              {/* 主要内容区域 */}
              <div className="grid grid-cols-3 gap-6">
                {/* 左侧：标题和内容 */}
                <div className="col-span-2 space-y-6">
                  {/* 标题输入 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <FiEdit3 className="h-5 w-5 text-gray-400" />
                      <label htmlFor="title" className="block text-base font-medium text-gray-900">
                        标题
                      </label>
                    </div>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-shadow duration-200 text-base"
                      placeholder="为你的提示词起个标题..."
                    />
                  </div>

                  {/* 内容输入 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <FiAlignLeft className="h-5 w-5 text-gray-400" />
                      <label htmlFor="content" className="block text-base font-medium text-gray-900">
                        内容
                      </label>
                    </div>
                    <textarea
                      id="content"
                      name="content"
                      value={formData.content}
                      onChange={handleChange}
                      required
                      rows={12}
                      className="block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-shadow duration-200 text-base font-mono"
                      placeholder="编写你的提示词内容..."
                    />
                  </div>
                </div>

                {/* 右侧：其他信息 */}
                <div className="space-y-6">
                  {/* 描述输入 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <FiInfo className="h-5 w-5 text-gray-400" />
                        <label htmlFor="description" className="block text-base font-medium text-gray-900">
                          描述
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoDescription}
                        disabled={generatingDesc}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full text-blue-600 hover:text-blue-500 hover:bg-blue-50 focus:outline-none transition-colors duration-200 disabled:opacity-50"
                      >
                        <FiRefreshCw className={`h-3 w-3 mr-1 ${generatingDesc ? 'animate-spin' : ''}`} />
                        AI 生成
                      </button>
                    </div>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
                      placeholder="描述这个提示词的用途..."
                    />
                  </div>

                  {/* 标签输入 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <FiTag className="h-5 w-5 text-gray-400" />
                        <label htmlFor="tags" className="block text-base font-medium text-gray-900">
                          标签
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoTag}
                        disabled={autoTagging}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full text-blue-600 hover:text-blue-500 hover:bg-blue-50 focus:outline-none transition-colors duration-200 disabled:opacity-50"
                      >
                        <FiRefreshCw className={`h-3 w-3 mr-1 ${autoTagging ? 'animate-spin' : ''}`} />
                        AI 生成
                      </button>
                    </div>
                    <textarea
                      id="tags"
                      name="tags"
                      value={formData.tags.join(', ')}
                      onChange={handleTagsChange}
                      rows={2}
                      className="block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
                      placeholder="输入标签，用逗号分隔..."
                    />
                    {formData.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                          >
                            <FiTag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 语言选择 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <FiCode className="h-5 w-5 text-gray-400" />
                      <label htmlFor="language" className="block text-base font-medium text-gray-900">
                        语言
                      </label>
                    </div>
                    <input
                      type="text"
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
                      placeholder="提示词使用的语言..."
                    />
                  </div>

                  {/* 用途输入 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <FiTarget className="h-5 w-5 text-gray-400" />
                      <label htmlFor="purpose" className="block text-base font-medium text-gray-900">
                        用途
                      </label>
                    </div>
                    <input
                      type="text"
                      id="purpose"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 transition-shadow duration-200"
                      placeholder="提示词的使用场景..."
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
} 