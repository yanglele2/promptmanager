import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiPlus, FiSearch, FiFolder, FiFolderPlus, FiEdit3, FiTrash2, FiTag, FiCopy, FiPlay, FiClock, FiSettings, FiUpload, FiZap } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import Layout from '@/components/Layout'
import TagFilter from '@/components/TagFilter'
import ImportPromptsModal from '@/components/ImportPromptsModal'
import SuggestEditButton from '@/components/SuggestEditButton'
import { supabase } from '@/lib/supabase'
import GeneratePromptModal from '@/components/GeneratePromptModal'
import { useSession } from '@/lib/hooks'

// 类型定义
interface Tag {
  id: string
  name: string
  user_id?: string
}

interface Folder {
  id: string
  name: string
  description?: string | null
  user_id: string
  parent_id?: string | null
  created_at: string
  updated_at: string
}

interface Prompt {
  id: string
  title: string
  content: string
  description: string
  created_at: string
  folder_id: string | null
  user_id?: string
}

interface PromptTag {
  tags: Tag
}

interface PromptWithTags extends Prompt {
  prompt_tags?: PromptTag[]
}

export default function Prompts() {
  const router = useRouter()
  const { session } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prompts, setPrompts] = useState<PromptWithTags[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderName, setFolderName] = useState('')
  const [folderDescription, setFolderDescription] = useState('')
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [showFolderSelect, setShowFolderSelect] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [isManaging, setIsManaging] = useState(false)
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)

  // 添加编辑处理函数
  const handleEdit = (promptId: string) => {
    router.push(`/prompts/${promptId}`)
  }

  // 添加方框点击处理函数
  const handleSquareClick = (e: React.MouseEvent, promptId: string) => {
    e.stopPropagation() // 阻止事件冒泡
    setSelectedCardId(promptId === selectedCardId ? null : promptId)
  }

  // 添加文件夹修改处理函数
  const handleFolderChange = async (promptId: string, folderId: string) => {
    try {
      // 先删除现有的文件夹关联
      const { error: deleteError } = await supabase
        .from('prompt_folders')
        .delete()
        .eq('prompt_id', promptId)

      if (deleteError) throw deleteError

      // 如果选择了文件夹，则添加新的关联
      if (folderId) {
        const { error: insertError } = await supabase
          .from('prompt_folders')
          .insert({
            prompt_id: promptId,
            folder_id: folderId
          })

        if (insertError) throw insertError
      }

      // 更新本地状态
      setPrompts(prompts.map(p => 
        p.id === promptId 
          ? { ...p, folder_id: folderId }
          : p
      ))
      
      toast.success('文件夹修改成功')
    } catch (error) {
      console.error('修改文件夹失败:', error)
      toast.error('修改文件夹失败')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('开始获取数据...')
        
        const [promptsResult, tagsResult, foldersResult] = await Promise.all([
          fetchPrompts(), 
          fetchTags(),
          fetchFolders()
        ])
        console.log('数据获取完成:', { 
          promptsCount: promptsResult?.length, 
          tagsCount: tagsResult?.length,
          foldersCount: foldersResult?.length 
        })
        
      } catch (err) {
        console.error('数据获取失败:', err)
        setError('数据加载失败，请刷新页面重试')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  async function fetchPrompts() {
    try {
      console.log('获取提示词数据...')
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          prompt_tags (
            tags (
              id,
              name
            )
          ),
          prompt_folders!prompt_id(
            folder_id
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase 错误:', error)
        throw error
      }
      
      // 处理数据，将文件夹ID添加到提示词对象中
      const processedData = data?.map(prompt => ({
        ...prompt,
        folder_id: prompt.prompt_folders?.[0]?.folder_id || null
      })) || []
      
      console.log('提示词数据:', processedData)
      setPrompts(processedData)
      return processedData
    } catch (error) {
      console.error('获取提示词失败:', error)
      throw error
    }
  }

  async function fetchTags() {
    try {
      console.log('获取标签数据...')
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')

      if (error) {
        console.error('Supabase 错误:', error)
        throw error
      }

      console.log('标签数据:', data)
      setTags(data || [])
      return data
    } catch (error) {
      console.error('获取标签失败:', error)
      throw error
    }
  }

  async function fetchFolders() {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFolders(data || [])
      return data
    } catch (error) {
      console.error('获取文件夹失败:', error)
      throw error
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: newFolderName,
          user_id: prompts[0]?.user_id // 使用当前用户ID
        })
        .select()
        .single()

      if (error) throw error

      setFolders([...(data ? [data] : []), ...folders])
      setNewFolderName('')
      setShowNewFolderModal(false)
    } catch (error) {
      console.error('创建文件夹失败:', error)
    }
  }

  async function handleMoveToFolder(promptId: string, folderId: string) {
    try {
      // 先删除现有的文件夹关联
      const { error: deleteError } = await supabase
        .from('prompt_folders')
        .delete()
        .eq('prompt_id', promptId)

      if (deleteError) throw deleteError

      // 如果选择了文件夹，则添加新的关联
      if (folderId) {
        const { error: insertError } = await supabase
          .from('prompt_folders')
          .insert({
            prompt_id: promptId,
            folder_id: folderId
          })

        if (insertError) throw insertError
      }

      // 更新本地状态
      setPrompts(prompts.map(p => 
        p.id === promptId 
          ? { ...p, folder_id: folderId }
          : p
      ))
      
      toast.success('移动成功')
    } catch (error) {
      console.error('移动提示词失败:', error)
      toast.error('移动提示词失败')
    } finally {
      setShowFolderSelect(false)
      setSelectedPromptId('')
    }
  }

  async function handleDelete(promptId: string) {
    if (!window.confirm('确定要删除这个提示词吗？')) return

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId)

      if (error) throw error

      setPrompts(prompts.filter(p => p.id !== promptId))
    } catch (error) {
      console.error('Error deleting prompt:', error)
    }
  }

  const handleCreateFolder = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: folderName,
          description: folderDescription,
          user_id: prompts[0]?.user_id
        })
        .select()
        .single()

      if (error) throw error

      setFolders([...(data ? [data] : []), ...folders])
      setFolderName('')
      setFolderDescription('')
      setShowFolderModal(false)
      toast.success('文件夹创建成功')
    } catch (error) {
      console.error('创建文件夹失败:', error)
      toast.error('创建文件夹失败')
    }
  }

  const handleUpdateFolder = async () => {
    if (!editingFolder) return

    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: folderName,
          description: folderDescription
        })
        .eq('id', editingFolder.id)

      if (error) throw error

      setFolders(folders.map(f => 
        f.id === editingFolder.id 
          ? { ...f, name: folderName, description: folderDescription }
          : f
      ))
      setEditingFolder(null)
      setFolderName('')
      setFolderDescription('')
      setShowFolderModal(false)
      toast.success('文件夹更新成功')
    } catch (error) {
      console.error('更新文件夹失败:', error)
      toast.error('更新文件夹失败')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('确定要删除这个文件夹吗？文件夹中的提示词将被移出文件夹。')) return

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (error) throw error

      setFolders(folders.filter(f => f.id !== folderId))
      if (selectedFolder === folderId) {
        setSelectedFolder('')
      }
      toast.success('文件夹删除成功')
    } catch (error) {
      console.error('删除文件夹失败:', error)
      toast.error('删除文件夹失败')
    }
  }

  const openEditFolder = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingFolder(folder)
    setFolderName(folder.name)
    setFolderDescription(folder.description || '')
    setShowFolderModal(true)
  }

  // 处理标签点击
  const handleTagClick = (tagName: string) => {
    setSelectedTags(prev => {
      const isSelected = prev.includes(tagName)
      if (isSelected) {
        return prev.filter(t => t !== tagName)
      } else {
        return [...prev, tagName]
      }
    })
    setCurrentPage(1) // 重置页码
  }

  // 过滤提示词
  const filteredPrompts = useMemo(() => {
    return prompts.filter(prompt => {
      // 搜索词过滤
      const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())

      // 文件夹过滤
      const matchesFolder = !currentFolder || prompt.folder_id === currentFolder

      // 标签过滤
      const promptTags = prompt.prompt_tags?.map(pt => pt.tags.name) || []
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => promptTags.includes(tag))

      return matchesSearch && matchesFolder && matchesTags
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return sortOrder === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      } else {
        return sortOrder === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [prompts, searchTerm, currentFolder, selectedTags, sortBy, sortOrder])

  // 分页后的提示词列表
  const paginatedPrompts = filteredPrompts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 总页数
  const totalPages = Math.ceil(filteredPrompts.length / pageSize)

  // 修改批量删除的处理函数
  const handleBatchDelete = async () => {
    if (selectedPrompts.length === 0) return
    if (!window.confirm(`确定要删除选中的 ${selectedPrompts.length} 个提示词吗？`)) return
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .in('id', selectedPrompts)

      if (error) throw error

      setPrompts(prompts.filter(p => !selectedPrompts.includes(p.id)))
      setSelectedPrompts([])
      toast.success('批量删除成功')
    } catch (error) {
      console.error('批量删除失败:', error)
      toast.error('批量删除失败')
    }
  }

  const handleImportPrompts = async (prompts: any[]) => {
    try {
      // 批量插入提示词
      const { data: insertedPrompts, error: promptsError } = await supabase
        .from('prompts')
        .insert(
          prompts.map(prompt => ({
            title: prompt.title,
            content: prompt.content,
            description: prompt.description || null,
            user_id: prompts[0]?.user_id, // 使用当前用户ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
        )
        .select()

      if (promptsError) throw promptsError

      // 处理标签
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]
        const insertedPrompt = insertedPrompts[i]
        
        if (prompt.tags) {
          const tags = prompt.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          
          for (const tagName of tags) {
            // 创建或获取标签
            const { data: tag, error: tagError } = await supabase
              .from('tags')
              .upsert({ name: tagName }, { onConflict: 'name' })
              .select()
              .single()

            if (tagError) {
              console.error('处理标签失败:', tagError)
              continue
            }

            // 创建提示词和标签的关联
            const { error: linkError } = await supabase
              .from('prompt_tags')
              .insert({
                prompt_id: insertedPrompt.id,
                tag_id: tag.id
              })

            if (linkError) {
              console.error('关联标签失败:', linkError)
            }
          }
        }
      }

      // 刷新提示词列表
      fetchPrompts()
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  }

  const handleSuggestEdit = () => {
    // 这里添加建议编辑的处理逻辑
  }

  const handleGenerate = async (prompt: { title: string, content: string, description: string }) => {
    try {
      // 创建提示词
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .insert({
          title: prompt.title,
          content: prompt.content,
          description: prompt.description,
          user_id: session?.user?.id,
        })
        .select()
        .single()

      if (promptError) throw promptError

      // 刷新提示词列表
      fetchPrompts()
      toast.success('提示词创建成功')
    } catch (error) {
      console.error('创建提示词失败:', error)
      toast.error('创建提示词失败')
    }
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-4 text-red-600">{error}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {/* 顶部区域 */}
        <div className="sm:flex sm:items-center border-b border-gray-200 pb-6">
          <div className="sm:flex-auto">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">提示词库</h1>
              <span className="px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">Beta</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              管理和组织您的所有AI提示词，提高工作效率
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <FiUpload className="mr-2 h-4 w-4" />
              批量导入
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <FiZap className="mr-2 h-4 w-4" />
              生成提示词
            </button>
            <Link
              href="/prompts/new"
              className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              新建提示词
            </Link>
          </div>
        </div>

        <div className="mt-8 flex space-x-8">
          {/* 左侧文件夹列表 */}
          <div className="w-64 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900">文件夹</h3>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="p-1.5 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <FiFolderPlus className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setSelectedFolder('')}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium border-b border-gray-100 transition-colors duration-200 ${
                  selectedFolder === '' ? 'bg-gradient-to-r from-indigo-50 to-white text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <FiFolder className={`mr-2 h-4 w-4 ${selectedFolder === '' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  所有提示词
                </div>
              </button>
              <div className="p-2">
                {folders.map((folder) => (
                  <div key={folder.id} className="group relative rounded-lg">
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 ${
                        selectedFolder === folder.id ? 'bg-gradient-to-r from-indigo-50 to-white text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <FiFolder className={`mr-2 h-4 w-4 ${selectedFolder === folder.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                        <span className="truncate">{folder.name}</span>
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center space-x-1">
                      <button
                        onClick={(e) => openEditFolder(e, folder)}
                        className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors duration-200"
                      >
                        <FiEdit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1">
            {/* 标签筛选区域 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
              {/* 搜索和筛选控件 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-lg">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                        placeholder="搜索提示词..."
                      />
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-3">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'created_at' | 'title')}
                      className="block pl-3 pr-10 py-2 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                    >
                      <option value="created_at">按时间</option>
                      <option value="title">按标题</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    >
                      <FiClock className={`h-4 w-4 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
                    </button>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="block pl-3 pr-10 py-2 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                    >
                      <option value="10">10条/页</option>
                      <option value="20">20条/页</option>
                      <option value="50">50条/页</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 标签云区域 */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.name)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTags.includes(tag.name)
                          ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {tag.name}
                      {selectedTags.includes(tag.name) && (
                        <span className="ml-1 text-xs bg-indigo-200 text-indigo-800 px-1.5 rounded-full">
                          {filteredPrompts.filter(p => 
                            p.prompt_tags?.some(pt => pt.tags.name === tag.name)
                          ).length}
                        </span>
                      )}
                    </button>
                  ))}
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 提示词卡片列表 */}
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`group relative bg-white rounded-xl shadow-sm border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-300 ${
                    prompt.id === selectedCardId ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  style={{ height: '260px' }}
                  onClick={() => {
                    if (isManaging) {
                      setSelectedPrompts(prev =>
                        prev.includes(prompt.id)
                          ? prev.filter(id => id !== prompt.id)
                          : [...prev, prompt.id]
                      )
                    } else {
                      router.push(`/prompts/${prompt.id}`)
                    }
                  }}
                >
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-lg font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors duration-200">
                          {prompt.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {prompt.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(prompt.id)
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors duration-200"
                        >
                          <FiEdit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(prompt.id)
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex flex-wrap gap-2">
                        {prompt.prompt_tags?.map((pt: PromptTag) => (
                          <span
                            key={pt.tags.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 transition-colors duration-200 hover:bg-indigo-100"
                          >
                            <FiTag className="mr-1.5 h-3 w-3" />
                            {pt.tags.name}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-xs text-gray-500 flex items-center">
                              <FiClock className="mr-1.5 h-3.5 w-3.5" />
                              {new Date(prompt.created_at).toLocaleDateString()}
                            </div>
                            <select
                              value={prompt.folder_id || ''}
                              onChange={(e) => handleFolderChange(prompt.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-transparent transition-shadow duration-200"
                            >
                              <option value="">选择文件夹</option>
                              {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                  {folder.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(prompt.content)
                                  .then(() => toast.success('提示词已复制到剪贴板'))
                                  .catch(() => toast.error('复制失败'))
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors duration-200"
                            >
                              <FiCopy className="mr-1.5 h-3.5 w-3.5" />
                              复制
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.replace(`/chat/new?content=${encodeURIComponent(prompt.content)}`)
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors duration-200"
                            >
                              <FiPlay className="mr-1.5 h-3.5 w-3.5" />
                              运行
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ImportPromptsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportPrompts}
      />
      <SuggestEditButton 
        onClick={handleSuggestEdit} 
        onGenerateClick={() => setShowGenerateModal(true)}
      />
      <GeneratePromptModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
      />
    </Layout>
  )
} 