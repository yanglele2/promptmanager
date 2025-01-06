import { useState, useEffect } from 'react'
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

  // 过滤和排序后的提示词列表
  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFolder = !selectedFolder || prompt.folder_id === selectedFolder

    if (selectedTags.length === 0) return matchesSearch && matchesFolder

    const promptTags = prompt.prompt_tags?.map((pt: PromptTag) => pt.tags.id) ?? []
    return matchesSearch && matchesFolder && selectedTags.every(tag => promptTags.includes(tag))
  }).sort((a, b) => {
    const factor = sortOrder === 'asc' ? 1 : -1
    if (sortBy === 'title') {
      return factor * a.title.localeCompare(b.title)
    }
    return factor * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

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
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">提示词库</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理和组织您的所有AI提示词，提高工作效率
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-4">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <FiUpload className="w-4 h-4 mr-2" />
              批量导入
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <FiZap className="w-4 h-4 mr-2" />
              生成提示词
            </button>
            <Link
              href="/prompts/new"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto gap-2"
            >
              <FiPlus className="w-4 h-4" />
              新建提示词
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">文件夹</h2>
              <button
                onClick={() => {
                  setEditingFolder(null)
                  setFolderName('')
                  setFolderDescription('')
                  setShowFolderModal(true)
                }}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <FiFolderPlus className="mr-1" />
                新建文件夹
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                onClick={(e) => {
                  e.preventDefault()
                  setSelectedFolder('')
                }}
                className={`cursor-pointer p-4 rounded-lg border ${
                  selectedFolder === '' 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center text-gray-900">
                  <FiFolder className="mr-2" />
                  <span>所有提示词</span>
                </div>
              </div>
              
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`relative p-4 rounded-lg border ${
                    selectedFolder === folder.id 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      setSelectedFolder(folder.id)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-900">
                        <FiFolder className="mr-2" />
                        <span>{folder.name}</span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditingFolder(folder)
                            setFolderName(folder.name)
                            setFolderDescription(folder.description || '')
                            setShowFolderModal(true)
                          }}
                          className="p-1 text-gray-500 hover:text-indigo-600"
                        >
                          <FiEdit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteFolder(folder.id)
                          }}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {folder.description && (
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {folder.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索提示词..."
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created_at' | 'title')}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="created_at">按时间</option>
                <option value="title">按标题</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '升序' : '降序'}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                {viewMode === 'grid' ? '列表视图' : '网格视图'}
              </button>
                <button
                onClick={() => setIsManaging(!isManaging)}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                <FiSettings className={`w-5 h-5 ${isManaging ? 'text-indigo-600' : 'text-gray-500'}`} />
                </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="10">10条/页</option>
                <option value="30">30条/页</option>
                <option value="50">50条/页</option>
              </select>
              </div>
            </div>

          {isManaging && (
            <div className="bg-gray-50 p-4 rounded-lg mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                    <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    checked={selectedPrompts.length === filteredPrompts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPrompts(filteredPrompts.map(p => p.id))
                      } else {
                        setSelectedPrompts([])
                      }
                    }}
                  />
                  <span className="ml-2 text-sm text-gray-700">全选</span>
                </label>
                <span className="text-sm text-gray-500">
                  已选择 {selectedPrompts.length} 项
                </span>
                  </div>
              <div className="flex gap-2">
                  <button
                  onClick={handleBatchDelete}
                  disabled={selectedPrompts.length === 0}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <FiTrash2 className="mr-1.5 h-4 w-4" />
                  批量删除
                  </button>
            </div>
          </div>
        )}

          {/* 暂时隐藏标签筛选功能 */}
          {/* <TagFilter
            tags={tags}
            selectedTags={selectedTags}
            onTagSelect={(tagId: string) => {
              setSelectedTags((prev) =>
                prev.includes(tagId)
                  ? prev.filter((id) => id !== tagId)
                  : [...prev, tagId]
              )
            }}
          /> */}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FiSearch className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">未找到提示词</h3>
              <p className="mt-1 text-sm text-gray-500">开始创建您的第一个提示词吧</p>
              <div className="mt-6">
                <Link
                  href="/prompts/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FiPlus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  新建提示词
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {filteredPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`relative bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${
                      prompt.id === selectedCardId ? 'bg-blue-50' : ''
                    } hover:bg-blue-50`}
                    style={{ height: '240px' }}
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
                        <h3 className="text-lg font-medium text-gray-900 truncate flex-1 pr-4">
                          {prompt.title}
                        </h3>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <select
                          value={prompt.folder_id || ''}
                            onChange={(e) => handleFolderChange(prompt.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="">选择文件夹</option>
                          {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </select>
                          {isManaging && (
                            <input
                              type="checkbox"
                              checked={selectedPrompts.includes(prompt.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                setSelectedPrompts(prev =>
                                  prev.includes(prompt.id)
                                    ? prev.filter(id => id !== prompt.id)
                                    : [...prev, prompt.id]
                                )
                              }}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(prompt.id)
                            }}
                            className="p-1 text-gray-500 hover:text-indigo-600"
                          >
                            <FiEdit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(prompt.id)
                            }}
                            className="p-1 text-gray-500 hover:text-red-600"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 flex-1">
                        {prompt.description}
                      </p>
                      <div className="mt-auto">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {prompt.prompt_tags?.map((pt: PromptTag) => (
                            <span
                              key={pt.tags.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              <FiTag className="mr-1.5 h-3 w-3" />
                              {pt.tags.name}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-500 flex items-center">
                            <FiClock className="mr-1.5 h-4 w-4" />
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </div>
                          <div className="flex gap-2">
                          <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(prompt.content)
                                  .then(() => toast.success('提示词已复制到剪贴板'))
                                  .catch(() => toast.error('复制失败'))
                              }}
                              className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                              <FiCopy className="mr-1.5 h-4 w-4" />
                              复制提示词内容
                          </button>
                          <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.replace(`/chat/new?content=${encodeURIComponent(prompt.content)}`)
                              }}
                              className="inline-flex items-center px-2 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                              <FiPlay className="mr-1.5 h-4 w-4" />
                              运行
                          </button>
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, filteredPrompts.length)}
                  </span>{' '}
                  条，共{' '}
                  <span className="font-medium">{filteredPrompts.length}</span> 条
                </div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">上一页</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {Array.from({ length: Math.ceil(filteredPrompts.length / pageSize), }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === currentPage
                          ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredPrompts.length / pageSize)))}
                    disabled={currentPage === Math.ceil(filteredPrompts.length / pageSize)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">下一页</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          )}
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