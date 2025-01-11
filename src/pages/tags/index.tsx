import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiTag, FiRefreshCw, FiSearch } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'

interface Tag {
  id: string
  name: string
  user_id?: string
  prompt_count?: number
  created_at: string
  updated_at?: string
}

export default function Tags() {
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState<Tag[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [cleanupLoading, setCleanupLoading] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      // 获取标签及其使用次数
      const { data, error } = await supabase
        .from('tags')
        .select(`
          *,
          prompt_tags!left (
            tag_id
          )
        `)

      if (error) throw error

      // 处理数据，添加使用次数
      const processedTags = data.map(tag => ({
        ...tag,
        prompt_count: tag.prompt_tags?.length || 0
      }))

      setTags(processedTags)
    } catch (error) {
      console.error('获取标签失败:', error)
      toast.error('获取标签失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!window.confirm('确定要删除这个标签吗？')) return

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error

      setTags(tags.filter(tag => tag.id !== tagId))
      toast.success('标签删除成功')
    } catch (error) {
      console.error('删除标签失败:', error)
      toast.error('删除标签失败')
    }
  }

  const handleCleanupTags = async () => {
    if (!window.confirm('确定要清理未使用的标签吗？这将删除所有未被提示词使用的标签。')) return

    try {
      setCleanupLoading(true)
      
      // 获取所有标签及其使用情况
      const { data: tagsWithUsage, error: fetchError } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          prompt_tags!left (
            tag_id
          )
        `)

      if (fetchError) throw fetchError

      // 找出未使用的标签
      const unusedTags = tagsWithUsage?.filter(tag => !tag.prompt_tags?.length) || []

      if (!unusedTags.length) {
        toast.success('没有需要清理的标签')
        return
      }

      // 删除未使用的标签
      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .in('id', unusedTags.map(tag => tag.id))

      if (deleteError) throw deleteError

      // 刷新标签列表
      await fetchTags()
      toast.success(`成功清理 ${unusedTags.length} 个未使用的标签：${unusedTags.map(t => t.name).join(', ')}`)
    } catch (error) {
      console.error('清理标签失败:', error)
      toast.error('清理标签失败')
    } finally {
      setCleanupLoading(false)
    }
  }

  // 过滤标签的函数
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        {/* 顶部区域 */}
        <div className="sm:flex sm:items-center border-b border-gray-200 pb-6">
          <div className="sm:flex-auto">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">标签管理</h1>
              <span className="px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">Beta</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              管理和清理提示词标签，保持标签系统的整洁
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={handleCleanupTags}
              disabled={cleanupLoading}
              className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-2 h-4 w-4 ${cleanupLoading ? 'animate-spin' : ''}`} />
              清理未使用标签
            </button>
          </div>
        </div>

        {/* 搜索区域 */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow duration-200"
                  placeholder="搜索标签..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* 标签列表 */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50 px-6 py-3">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标签名称</div>
                <div className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider">使用次数</div>
                <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</div>
                <div className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</div>
              </div>
            </div>
            <div className="bg-white divide-y divide-gray-200">
              {loading ? (
                <div className="px-6 py-8 text-center">
                  <div className="inline-flex items-center">
                    <FiRefreshCw className="animate-spin h-5 w-5 text-indigo-500 mr-2" />
                    <span className="text-sm text-gray-500">加载中...</span>
                  </div>
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <FiTag className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm ? '未找到匹配的标签' : '暂无标签'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? '请尝试其他搜索词' : '标签列表为空'}
                  </p>
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <div key={tag.id} className="group hover:bg-gray-50">
                    <div className="px-6 py-4 grid grid-cols-4 gap-4 items-center">
                      <div className="flex items-center">
                        <FiTag className={`h-4 w-4 ${(tag.prompt_count || 0) > 0 ? 'text-indigo-500' : 'text-gray-400'} mr-2`} />
                        <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                      </div>
                      <div className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (tag.prompt_count || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tag.prompt_count || 0} 次使用
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(tag.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-right">
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center p-1.5 border border-transparent rounded-lg text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                          title="删除标签"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 