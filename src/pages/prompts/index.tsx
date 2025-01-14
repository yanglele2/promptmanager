import { useState, useEffect, Fragment, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiPlus, FiSearch, FiFolder, FiFolderPlus, FiEdit3, FiTrash2, FiTag, FiCopy, FiPlay, FiClock, FiSettings, FiUpload, FiZap, FiChevronDown, FiDatabase, FiStar, FiRefreshCw, FiChevronsLeft, FiChevronsRight, FiCheck } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import Layout from '@/components/Layout'
import TagFilter from '@/components/TagFilter'
import ImportPromptsModal from '@/components/ImportPromptsModal'
import SuggestEditButton from '@/components/SuggestEditButton'
import { supabase } from '@/lib/supabase'
import GeneratePromptModal from '@/components/GeneratePromptModal'
import { useSession } from '@/lib/hooks'
import { Transition, Dialog } from '@headlessui/react'
import { debounce } from 'lodash'

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
  is_favorite?: boolean
  use_count?: number
}

interface SmartSearchResult {
  id: string
  title: string
  description: string
  content: string
  match_score: number
  tags: Array<{
    id: string
    name: string
  }>
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
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'use_count'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFolderModal, setShowFolderModal] = useState(false)
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
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showSmartSearchModal, setShowSmartSearchModal] = useState(false)
  const [smartSearchQuery, setSmartSearchQuery] = useState('')
  const [smartSearchResults, setSmartSearchResults] = useState<SmartSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // 新增状态变量
  const [showSidebar, setShowSidebar] = useState(true)
  const [folderSearchTerm, setFolderSearchTerm] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])

  // 使用防抖优化输入
  const debouncedSetFolderName = useCallback(
    debounce((value: string) => {
      setFolderName(value)
    }, 100),
    []
  )

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

  const handleCreateFolder = async (name: string, description: string) => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          user_id: session?.user?.id
        })
        .select()
        .single()

      if (error) throw error

      setFolders([...(data ? [data] : []), ...folders])
      setShowFolderModal(false)
      toast.success('文件夹创建成功')
    } catch (error) {
      console.error('创建文件夹失败:', error)
      toast.error('创建文件夹失败')
    }
  }

  const handleUpdateFolder = async (name: string, description: string) => {
    if (!editingFolder) return

    try {
      const { error } = await supabase
        .from('folders')
        .update({
          name: name.trim(),
          description: description.trim() || null
        })
        .eq('id', editingFolder.id)

      if (error) throw error

      setFolders(folders.map(f => 
        f.id === editingFolder.id 
          ? { ...f, name: name.trim(), description: description.trim() || null }
          : f
      ))
      setEditingFolder(null)
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
    if (sortBy === 'use_count') {
      return factor * ((a.use_count || 0) - (b.use_count || 0))
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

  const handleToggleFavorite = async (promptId: string) => {
    try {
      const isFavorite = favorites.includes(promptId)
      if (isFavorite) {
        setFavorites(favorites.filter(id => id !== promptId))
      } else {
        setFavorites([...favorites, promptId])
      }
      
      // TODO: 将收藏状态保存到数据库
      toast.success(isFavorite ? '已取消收藏' : '已添加到收藏')
    } catch (error) {
      console.error('更新收藏状态失败:', error)
      toast.error('操作失败')
    }
  }

  // 添加记录提示词使用的函数
  const logPromptUsage = async (promptId: string, context: string = 'chat') => {
    try {
      const { error } = await supabase
        .from('prompt_usage_logs')
        .insert({
          prompt_id: promptId,
          user_id: session?.user?.id,
          context
        })

      if (error) throw error

      // 本地更新使用次数
      setPrompts(prompts.map(p => 
        p.id === promptId 
          ? { ...p, use_count: (p.use_count || 0) + 1 }
          : p
      ))
    } catch (error) {
      console.error('记录使用次数失败:', error)
    }
  }

  // 添加卡片点击处理函数
  const handleCardClick = (promptId: string) => {
    if (isManaging) {
      // 在管理模式下，点击卡片切换选中状态
      setSelectedPrompts(prev => 
        prev.includes(promptId) 
          ? prev.filter(id => id !== promptId)
          : [...prev, promptId]
      )
    } else {
      // 非管理模式下，跳转到详情页
      router.push(`/prompts/${promptId}`)
    }
  }

  const PromptCard = ({ prompt }: { prompt: PromptWithTags }) => {
    const isFavorite = favorites.includes(prompt.id)
    
    return (
      <div
        key={prompt.id}
        onClick={() => handleCardClick(prompt.id)}
        className={`
          relative bg-white rounded-lg shadow-sm border transition-all cursor-pointer
          ${isManaging ? 'hover:border-indigo-500' : 'hover:shadow-md'}
          ${selectedPrompts.includes(prompt.id) ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50' : 'border-gray-200'}
        `}
      >
        {/* 选中状态指示器 */}
        {isManaging && (
          <div className={`
            absolute top-3 right-3 w-5 h-5 rounded-full border-2 transition-colors
            ${selectedPrompts.includes(prompt.id) 
              ? 'border-indigo-500 bg-indigo-500' 
              : 'border-gray-300 bg-white'}
          `}>
            {selectedPrompts.includes(prompt.id) && (
              <FiCheck className="w-full h-full text-white p-0.5" />
            )}
          </div>
        )}
        
        {/* 卡片内容 */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-medium text-gray-900 truncate">{prompt.title}</h3>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center">
              <FiClock className="mr-1 h-3 w-3" />
              {new Date(prompt.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center">
              <FiPlay className="mr-1 h-3 w-3" />
              使用 {prompt.use_count || 0} 次
            </span>
          </div>

          <div className="flex-1 min-h-0">
            <p className="text-sm text-gray-500 line-clamp-2 mb-2">
              {prompt.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {prompt.prompt_tags?.map((pt: PromptTag) => (
                <span
                  key={pt.tags.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                >
                  <FiTag className="mr-1 h-3 w-3" />
                  {pt.tags.name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <select
                value={prompt.folder_id || ''}
                onChange={(e) => handleFolderChange(prompt.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 max-w-[120px]"
              >
                <option value="">选择文件夹</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(prompt.content)
                      .then(() => toast.success('提示词已复制到剪贴板'))
                      .catch(() => toast.error('复制失败'))
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
                >
                  <FiCopy className="mr-1 h-3 w-3" />
                  复制
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    await logPromptUsage(prompt.id)
                    router.replace(`/chat/new?content=${encodeURIComponent(prompt.content)}`)
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  <FiPlay className="mr-1 h-3 w-3" />
                  运行
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 添加文件夹模态框组件
  const FolderModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const nameInputRef = useRef<HTMLInputElement>(null)
    const descInputRef = useRef<HTMLTextAreaElement>(null)

    const handleSubmit = () => {
      const name = nameInputRef.current?.value || ''
      const desc = descInputRef.current?.value || ''
      
      if (!name.trim()) {
        toast.error('请输入文件夹名称')
        return
      }

      if (editingFolder) {
        handleUpdateFolder(name, desc)
      } else {
        handleCreateFolder(name, desc)
      }
      onClose()
    }

    useEffect(() => {
      if (isOpen && nameInputRef.current) {
        nameInputRef.current.value = editingFolder?.name || ''
        if (descInputRef.current) {
          descInputRef.current.value = editingFolder?.description || ''
        }
      }
    }, [isOpen, editingFolder])

    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2"
                  >
                    <FiFolderPlus className="w-5 h-5 text-indigo-600" />
                    {editingFolder ? '编辑文件夹' : '新建文件夹'}
                  </Dialog.Title>
                  <div className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="folderName" className="block text-sm font-medium text-gray-700">
                          文件夹名称
                        </label>
                        <input
                          type="text"
                          id="folderName"
                          ref={nameInputRef}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="请输入文件夹名称"
                        />
                      </div>
                      <div>
                        <label htmlFor="folderDescription" className="block text-sm font-medium text-gray-700">
                          描述（可选）
                        </label>
                        <textarea
                          id="folderDescription"
                          ref={descInputRef}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="请输入文件夹描述"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={onClose}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={handleSubmit}
                    >
                      {editingFolder ? '保存' : '创建'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    )
  }

  // 添加智能搜索模态框组件
  const SmartSearchModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [searchInput, setSearchInput] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [localSearchResults, setLocalSearchResults] = useState<SmartSearchResult[]>([])

    const handleSearch = async () => {
      if (!searchInput.trim()) {
        toast.error('请输入搜索内容')
        return
      }

      try {
        setIsSearching(true)
        const response = await fetch('/api/prompts/smart-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: searchInput }),
        })

        if (!response.ok) {
          throw new Error('搜索请求失败')
        }

        const data = await response.json()
        
        if (data.success) {
          setLocalSearchResults(data.data.results || [])
          if (data.data.message) {
            toast(data.data.message, {
              icon: '⚠️',
              duration: 3000
            })
          }
        } else {
          throw new Error(data.error || '搜索失败')
        }
      } catch (error) {
        console.error('智能搜索失败:', error)
        toast.error('搜索失败，请重试')
      } finally {
        setIsSearching(false)
      }
    }

    // 清理函数
    useEffect(() => {
      if (!isOpen) {
        setSearchInput('')
        setLocalSearchResults([])
      }
    }, [isOpen])

    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 flex items-center gap-2 mb-4"
                  >
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FiZap className="w-5 h-5 text-indigo-600" />
                    </div>
                    AI 智能搜索
                  </Dialog.Title>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          使用自然语言描述您要搜索的内容
                        </p>
                        <div className="text-xs text-gray-400">
                          例如：帮我找一个写文章的提示词
                        </div>
                      </div>
                      <div className="mt-2 relative">
                        <textarea
                          rows={3}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm resize-none"
                          placeholder="请输入您的搜索需求..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute right-2 bottom-2 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed gap-1.5 transition-colors"
                          onClick={handleSearch}
                          disabled={isSearching || !searchInput.trim()}
                        >
                          {isSearching ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              搜索中...
                            </>
                          ) : (
                            <>
                              <FiZap className="w-4 h-4" />
                              开始搜索
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 搜索结果区域 */}
                    {localSearchResults.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            搜索结果
                          </h4>
                          <span className="text-xs text-gray-500">
                            找到 {localSearchResults.length} 个相关提示词
                          </span>
                        </div>
                        <div className="space-y-3">
                          {localSearchResults.map((result) => (
                            <div
                              key={result.id}
                              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group"
                              onClick={() => {
                                router.push(`/prompts/${result.id}`)
                                onClose()
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                                    {result.title}
                                  </h5>
                                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                    {result.description}
                                  </p>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    匹配度 {Math.round(result.match_score)}%
                                  </span>
                                </div>
                              </div>
                              {result.tags?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {result.tags.map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                      <FiTag className="mr-1 h-3 w-3" />
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={onClose}
                    >
                      关闭
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    )
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
      <div className="flex h-[calc(100vh-64px)]">
        {/* 窄边栏 - 用于展开按钮 */}
        {!showSidebar && (
          <div className="w-8 flex-shrink-0 border-r border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            <button
              onClick={() => setShowSidebar(true)}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-600"
              title="展开文件夹面板"
            >
              <FiChevronsRight size={16} />
              <span className="[writing-mode:vertical-lr] [text-orientation:upright] text-xs font-medium tracking-wider py-2">展开文件夹</span>
            </button>
          </div>
        )}

        {/* 主侧边栏 */}
        <div className={`${showSidebar ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 border-r border-gray-200 bg-white overflow-hidden relative`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">文件夹</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingFolder(null)
                      setFolderName('')
                      setFolderDescription('')
                      setShowFolderModal(true)
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 gap-1.5"
                    title="新建文件夹"
                  >
                    <FiFolderPlus size={16} />
                    新建文件夹
                  </button>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-gray-100"
                    title="收起文件夹面板"
                  >
                    <FiChevronsLeft size={18} />
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索文件夹..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  value={folderSearchTerm}
                  onChange={(e) => setFolderSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder('')}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                    selectedFolder === '' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FiFolder className="mr-2 h-4 w-4" />
                  <span className="truncate">所有提示词</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {prompts.length}
                  </span>
                </button>
                
                {folders
                  .filter(folder => 
                    folder.name.toLowerCase().includes(folderSearchTerm.toLowerCase())
                  )
                  .map((folder) => (
                    <div key={folder.id} className="relative group">
                      <button
                        onClick={() => setSelectedFolder(folder.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                          selectedFolder === folder.id 
                            ? 'bg-indigo-50 text-indigo-600' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FiFolder className="mr-2 h-4 w-4" />
                        <span className="truncate">{folder.name}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {prompts.filter(p => p.folder_id === folder.id).length}
                        </span>
                      </button>
                      
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setEditingFolder(folder)
                            setFolderName(folder.name)
                            setFolderDescription(folder.description || '')
                            setShowFolderModal(true)
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <FiEdit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (window.confirm('确定要删除这个文件夹吗？文件夹中的提示词将被移出文件夹。')) {
                              handleDeleteFolder(folder.id)
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* 页面顶部区域 */}
            <div className="border-b border-gray-200 pb-5 mb-6">
              <div className="sm:flex sm:items-center sm:justify-between">
                <div className="sm:flex-auto">
                  <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">提示词库</h1>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        <FiDatabase className="w-4 h-4 mr-1" />
                        {filteredPrompts.length} 个提示词
                      </span>
                      <span className="flex items-center">
                        <FiFolder className="w-4 h-4 mr-1" />
                        {folders.length} 个文件夹
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">
                    管理和组织您的所有AI提示词，提高工作效率
                  </p>
                </div>
                
                <div className="mt-4 sm:mt-0 sm:flex-none flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      操作
                      <FiChevronDown className="ml-2 h-4 w-4" />
                    </button>
                    
                    {showActionsMenu && (
                      <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                        <button
                          onClick={() => {
                            setShowActionsMenu(false)
                            setShowImportModal(true)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiUpload className="mr-3 h-4 w-4" />
                          导入提示词
                        </button>
                        <button
                          onClick={() => {
                            setShowActionsMenu(false)
                            setShowGenerateModal(true)
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiZap className="mr-3 h-4 w-4" />
                          AI生成提示词
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Link
                    href="/prompts/new"
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto gap-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    新建提示词
                  </Link>
                </div>
              </div>
              
              {/* 快速访问区 */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1 border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FiRefreshCw className="w-4 h-4" />
                    最后更新: {new Date(prompts[0]?.created_at || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 搜索和筛选区域 */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜索提示词..."
                  className="block w-full pl-10 pr-24 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  onClick={() => setShowSmartSearchModal(true)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-indigo-600 transition-colors group"
                  title="AI智能搜索"
                >
                  <div className="flex items-center gap-1.5 pr-1 border-l border-gray-200 pl-3">
                    <FiZap className="h-4 w-4 group-hover:text-yellow-500 transition-colors" />
                    <span className="text-sm group-hover:text-indigo-600">智能搜索</span>
                  </div>
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'created_at' | 'title' | 'use_count')}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="use_count">按使用次数</option>
                    <option value="created_at">按时间</option>
                    <option value="title">按标题</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="inline-flex items-center justify-center p-2 rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsManaging(!isManaging);
                      if (isManaging) {
                        setSelectedPrompts([]);
                      }
                    }}
                    className={`inline-flex items-center justify-center p-2 rounded-md border ${
                      isManaging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title={isManaging ? '退出管理' : '批量管理'}
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
            </div>
            
            {/* 批量管理工具栏 */}
            {isManaging && (
              <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (selectedPrompts.length === filteredPrompts.length) {
                        setSelectedPrompts([]);
                      } else {
                        setSelectedPrompts(filteredPrompts.map(p => p.id));
                      }
                    }}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${selectedPrompts.length === filteredPrompts.length
                        ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        : 'text-gray-600 hover:bg-gray-50 border border-gray-300'
                      }
                    `}
                  >
                    {selectedPrompts.length === filteredPrompts.length ? '取消全选' : '全选'}
                  </button>
                  {selectedPrompts.length > 0 && (
                    <button
                      onClick={handleBatchDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                    >
                      删除选中 ({selectedPrompts.length})
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsManaging(false);
                    setSelectedPrompts([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  退出管理
                </button>
              </div>
            )}
            
            {/* 提示词列表区域 */}
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
                    {paginatedPrompts.map((prompt) => (
                      <PromptCard key={prompt.id} prompt={prompt} />
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
      <FolderModal
        isOpen={showFolderModal}
        onClose={() => {
          setShowFolderModal(false)
          setEditingFolder(null)
          setFolderName('')
          setFolderDescription('')
        }}
      />
      <SmartSearchModal
        isOpen={showSmartSearchModal}
        onClose={() => setShowSmartSearchModal(false)}
      />
    </Layout>
  )
} 