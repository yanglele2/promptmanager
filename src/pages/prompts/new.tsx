import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { FiArrowLeft, FiZap, FiTag, FiSave, FiX, FiCheck, FiAlertCircle, FiEdit2, FiFileText, FiFolder, FiInfo } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/hooks'

interface Folder {
  id: string
  name: string
  description?: string
  user_id: string
  created_at: string
  updated_at: string
}

interface FormData {
  title: string
  content: string
  description: string
  tags: string[]
}

export default function NewPrompt() {
  const router = useRouter()
  const { session } = useSession()
  const [saving, setSaving] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    description: '',
    tags: []
  })

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name')

      if (error) throw error
      setFolders(data || [])
    } catch (error) {
      console.error('获取文件夹失败:', error)
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
      const response = await fetch('/api/prompts/auto-tag', {
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
      // 1. 创建提示词
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .insert({
          title: formData.title,
          content: formData.content,
          description: formData.description || null,
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

            // 创建提示词和标签的关联
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/40">
        {/* 顶部导航栏 */}
        <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 border-b border-gray-100 shadow-sm">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex items-center gap-8">
                <button
                  onClick={() => router.push('/prompts')}
                  className="group inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                  <span className="font-medium">返回提示词库</span>
                </button>
                <h1 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {formData.title || '创建新提示词'}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/prompts')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || !formData.title || !formData.content}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4 mr-2" />
                      发布提示词
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {/* 标题输入 */}
            <div className="relative group">
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="输入提示词标题..."
                className="block w-full text-3xl font-bold text-gray-900 placeholder-gray-400 border-0 border-b-2 border-transparent group-hover:border-gray-200 focus:border-indigo-500 focus:ring-0 bg-transparent transition-colors duration-200 px-0"
              />
              {!formData.title && (
                <div className="absolute top-full left-0 mt-2 text-xs text-gray-400 flex items-center">
                  <FiInfo className="w-4 h-4 mr-1" />
                  请输入一个清晰的标题
                </div>
              )}
            </div>

            {/* AI 辅助工具栏 */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 rounded-2xl border border-indigo-100/50 shadow-sm backdrop-blur-sm">
              <div className="flex-1 flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100/50">
                  <FiZap className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="font-medium text-indigo-700">AI 智能助手</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutoDescription}
                  disabled={generatingDesc || !formData.title || !formData.content}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 gap-2 border border-indigo-200 shadow-sm hover:shadow-md"
                >
                  <FiZap className={`w-4 h-4 ${generatingDesc ? 'animate-pulse text-indigo-500' : ''}`} />
                  {generatingDesc ? '生成中...' : '生成描述'}
                </button>
                <button
                  type="button"
                  onClick={handleAutoTag}
                  disabled={autoTagging || !formData.title || !formData.content}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 gap-2 border border-indigo-200 shadow-sm hover:shadow-md"
                >
                  <FiZap className={`w-4 h-4 ${autoTagging ? 'animate-pulse text-indigo-500' : ''}`} />
                  {autoTagging ? '生成中...' : '生成标签'}
                </button>
              </div>
            </div>

            {/* 内容编辑区 */}
            <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <FiEdit2 className="w-4 h-4" />
                  <span>提示词内容</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formData.content.length} 字</span>
                </div>
              </div>
              <textarea
                name="content"
                required
                rows={12}
                value={formData.content}
                onChange={handleChange}
                placeholder="输入提示词内容..."
                className="block w-full rounded-2xl border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-relaxed pt-12 px-4 pb-4"
              />
            </div>

            {/* 描述输入 */}
            <div className="space-y-2">
              <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="absolute top-3 left-4 flex items-center gap-2 text-xs text-gray-400">
                  <FiFileText className="w-4 h-4" />
                  <span>简短描述</span>
                </div>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="添加简短描述，帮助他人更好地理解这个提示词..."
                  className="block w-full rounded-2xl border-0 bg-transparent text-gray-600 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-relaxed pt-10 px-4 pb-3"
                />
              </div>
              {!formData.description && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-xs">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>好的描述可以帮助其他用户更快地找到并理解你的提示词</span>
                </div>
              )}
            </div>

            {/* 标签和文件夹选择 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 标签输入 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FiTag className="w-4 h-4" />
                  标签
                </label>
                <div className="relative">
                  <textarea
                    value={formData.tags.join(', ')}
                    onChange={handleTagsChange}
                    placeholder="输入标签，用逗号分隔..."
                    rows={2}
                    className="block w-full rounded-xl border-gray-200 bg-white text-gray-600 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                  />
                  <div className="mt-3">
                    {formData.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-100 shadow-sm"
                          >
                            <FiTag className="w-3 h-3 mr-1.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                        <FiTag className="w-4 h-4" />
                        添加标签以便更好地分类和查找
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 文件夹选择 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FiFolder className="w-4 h-4" />
                  保存到文件夹
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="block w-full rounded-xl border-gray-200 bg-white text-gray-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                >
                  <option value="">选择文件夹（可选）</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                {!selectedFolderId && (
                  <p className="text-xs text-gray-500 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <FiInfo className="w-4 h-4" />
                    将提示词保存到文件夹中便于管理
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 