import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import TagFilter from '@/components/TagFilter'
import type { Tag, Folder, PromptWithTags } from '@/types/index'
import { FiSearch, FiPlus, FiTag, FiClock, FiEdit3, FiTrash2, FiFolder, FiFolderPlus, FiCopy, FiPlay } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/router'

export default function Prompts() {
  const { prompts, setPrompts, tags, setTags } = useStore()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderDescription, setFolderDescription] = useState('')
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [showFolderSelect, setShowFolderSelect] = useState(false)
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')
  const router = useRouter()

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

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch =
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFolder = !selectedFolder || prompt.folder_id === selectedFolder

    if (selectedTags.length === 0) return matchesSearch && matchesFolder

    const promptTags = prompt.prompt_tags?.map(pt => pt.tags.id) ?? []
    return matchesSearch && matchesFolder && selectedTags.every(tag => promptTags.includes(tag))
  }).sort((a, b) => {
    const factor = sortOrder === 'asc' ? 1 : -1
    if (sortBy === 'title') {
      return factor * a.title.localeCompare(b.title)
    }
    return factor * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

  const renderPromptCard = (prompt: PromptWithTags) => (
    <div key={prompt.id} className="relative bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium text-gray-900 truncate">
          {prompt.title}
        </h3>
        <div className="flex gap-2">
          <select
            value={prompt.folder_id || ''}
            onChange={(e) => handleMoveToFolder(prompt.id, e.target.value)}
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
      <p className="mt-2 text-sm text-gray-500 line-clamp-2">
        {prompt.description}
      </p>
      <div className="mt-4 flex items-center text-sm text-gray-500">
        <FiClock className="mr-1.5 h-4 w-4 flex-shrink-0" />
        {new Date(prompt.created_at).toLocaleDateString()}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompt.prompt_tags?.map((pt: { tags: Tag }) => (
          <span
            key={pt.tags.id}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
          >
            <FiTag className="mr-1.5 h-3 w-3" />
            {pt.tags.name}
          </span>
        ))}
      </div>
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(prompt.content)
              .then(() => toast.success('提示词已复制到剪贴板'))
              .catch(() => toast.error('复制失败'))
          }}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FiCopy className="mr-1.5 h-4 w-4" />
          复制
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            // 使用 replace 而不是 push，避免历史记录堆栈问题
            router.replace(`/chat/new?content=${encodeURIComponent(prompt.content)}`)
          }}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FiPlay className="mr-1.5 h-4 w-4" />
          点击运行
        </button>
      </div>
    </div>
  )

  const handleEdit = (promptId: string) => {
    router.push(`/prompts/${promptId}`)
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
            <div className="flex gap-2">
              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
              >
                <option value="">所有文件夹</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created_at' | 'title')}
              >
                <option value="created_at">按时间</option>
                <option value="title">按标题</option>
              </select>
              <button
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? '升序' : '降序'}
              </button>
              <button
                onClick={() => setViewMode(mode => mode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                {viewMode === 'grid' ? '列表视图' : '网格视图'}
              </button>
            </div>
          </div>
          <TagFilter
            tags={tags}
            selectedTags={selectedTags}
            onTagSelect={(tagId) => {
              setSelectedTags((prev) =>
                prev.includes(tagId)
                  ? prev.filter((id) => id !== tagId)
                  : [...prev, tagId]
              )
            }}
          />
        </div>

        {/* 新建文件夹模态框 */}
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新建文件夹</h3>
              <input
                type="text"
                placeholder="输入文件夹名称"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-4"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={createFolder}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 文件夹创建/编辑模态框 */}
        {showFolderModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowFolderModal(false)} />
              <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {editingFolder ? '编辑文件夹' : '新建文件夹'}
                  </h3>
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="文件夹名称"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                    />
                    <textarea
                      placeholder="文件夹描述（可选）"
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={folderDescription}
                      onChange={(e) => setFolderDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                    onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}
                  >
                    {editingFolder ? '更新' : '创建'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                    onClick={() => setShowFolderModal(false)}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="text-center py-8">
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
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrompts.map(renderPromptCard)}
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      描述
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      标签
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文件夹
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPrompts.map((prompt) => (
                    <tr key={prompt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {prompt.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {prompt.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {prompt.prompt_tags?.map((pt: { tags: Tag }) => (
                            <span
                              key={pt.tags.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              <FiTag className="mr-1.5 h-3 w-3" />
                              {pt.tags.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={prompt.folder_id || ''}
                          onChange={(e) => handleMoveToFolder(prompt.id, e.target.value)}
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(prompt.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <FiEdit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prompt.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
} 