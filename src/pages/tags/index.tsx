import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { toast } from 'react-hot-toast'
import { FiRefreshCw, FiAlertTriangle, FiInfo, FiTag, FiTrash2, FiSearch, FiChevronDown, FiChevronRight } from 'react-icons/fi'

interface TagStat {
  id: string
  name: string
  promptCount: number
  isOrphan: boolean
}

interface CheckResult {
  totalTags: number
  orphanTags: number
  tagDetails: TagStat[]
}

export default function TagsManagement() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOrphanOnly, setShowOrphanOnly] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    overview: false,
    guide: false,
    notice: false
  })

  const checkTags = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true)
      }
      
      const response = await fetch('/api/tags/check-orphans')
      if (!response.ok) {
        throw new Error('检查失败')
      }
      const data = await response.json()
      setResult(data)
      
      if (isManualRefresh) {
        toast.success('数据已更新')
      }
    } catch (error) {
      console.error('检查标签失败:', error)
      toast.error('检查失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    checkTags()
  }, [checkTags])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      checkTags()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, checkTags])

  const cleanupTags = async () => {
    if (!confirm('确定要清理所有孤立标签吗？此操作不可恢复。')) {
      return
    }

    setCleaning(true)
    try {
      const response = await fetch('/api/tags/cleanup', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '清理失败')
      }

      console.log('清理结果:', data)
      await checkTags(true)
      toast.success(`清理完成，共删除 ${data.deletedCount} 个孤立标签`)
    } catch (error: any) {
      console.error('清理失败:', error)
      toast.error(error.message || '清理失败')
    } finally {
      setCleaning(false)
    }
  }

  const filteredTags = result?.tagDetails.filter(tag => {
    if (showOrphanOnly && !tag.isOrphan) return false
    if (searchTerm && !tag.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  }) || []

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!result) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen text-center py-12">
          <FiAlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-500 text-lg font-medium">加载失败</p>
          <button
            onClick={() => checkTags(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 页面标题和操作按钮 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <FiTag className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">标签管理</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* 自动刷新开关 */}
            <div className="flex items-center bg-white px-4 py-2 rounded-lg shadow-sm">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  自动刷新
                </span>
              </label>
            </div>

            {/* 手动刷新按钮 */}
            <button
              onClick={() => checkTags(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="刷新数据"
            >
              <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>

            {/* 清理按钮 */}
            {result.orphanTags > 0 && (
              <button
                onClick={cleanupTags}
                disabled={cleaning}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <FiTrash2 className="w-5 h-5" />
                {cleaning ? '清理中...' : '清理孤立标签'}
              </button>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="space-y-6 mb-8">
          {/* 功能概述 */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-r-lg shadow-sm">
            <button
              onClick={() => toggleSection('overview')}
              className="w-full p-6 text-left focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiInfo className="h-6 w-6 text-blue-500" />
                  <h3 className="ml-4 text-lg font-medium text-blue-800">功能概述</h3>
                </div>
                {expandedSections.overview ? (
                  <FiChevronDown className="h-5 w-5 text-blue-500" />
                ) : (
                  <FiChevronRight className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </button>
            {expandedSections.overview && (
              <div className="px-6 pb-6">
                <div className="mt-2 text-sm text-blue-700 space-y-1">
                  <p className="mb-2">标签管理页面提供了全面的标签管理功能，帮助您有效地组织和维护提示词标签。</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="font-medium mb-2">核心功能</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>查看所有标签及其使用状态</li>
                        <li>识别和清理未使用的孤立标签</li>
                        <li>实时搜索和过滤标签</li>
                        <li>自动刷新数据</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">数据统计</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>总标签数量统计</li>
                        <li>孤立标签数量监控</li>
                        <li>每个标签的关联提示词数量</li>
                        <li>标签使用状态追踪</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 使用指南 */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-500 rounded-r-lg shadow-sm">
            <button
              onClick={() => toggleSection('guide')}
              className="w-full p-6 text-left focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiInfo className="h-6 w-6 text-gray-500" />
                  <h3 className="ml-4 text-lg font-medium text-gray-800">使用指南</h3>
                </div>
                {expandedSections.guide ? (
                  <FiChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <FiChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </button>
            {expandedSections.guide && (
              <div className="px-6 pb-6">
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">1. 数据刷新</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>手动刷新：点击刷新按钮立即更新数据</li>
                      <li>自动刷新：开启后每30秒自动更新一次数据</li>
                      <li>刷新时会自动检测新的孤立标签</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">2. 搜索和过滤</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>使用搜索框按标签名称搜索</li>
                      <li>勾选"只显示孤立标签"快速查看需要处理的标签</li>
                      <li>搜索支持实时过滤，无需点击搜索按钮</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">3. 标签清理</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>系统自动识别未关联提示词的孤立标签</li>
                      <li>使用清理功能前建议先确认标签状态</li>
                      <li>清理操作不可撤销，请谨慎操作</li>
                      <li>清理完成后系统会自动刷新数据</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">4. 状态说明</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li><span className="text-green-700">正常</span>：标签已关联提示词，正常使用中</li>
                      <li><span className="text-red-700">孤立</span>：标签未关联任何提示词，可以考虑清理</li>
                      <li>标签名称旁的图标颜色也表示其状态</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 注意事项 */}
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-r-lg shadow-sm">
            <button
              onClick={() => toggleSection('notice')}
              className="w-full p-6 text-left focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiAlertTriangle className="h-6 w-6 text-yellow-500" />
                  <h3 className="ml-4 text-lg font-medium text-yellow-800">注意事项</h3>
                </div>
                {expandedSections.notice ? (
                  <FiChevronDown className="h-5 w-5 text-yellow-500" />
                ) : (
                  <FiChevronRight className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </button>
            {expandedSections.notice && (
              <div className="px-6 pb-6">
                <div className="mt-2 text-sm text-yellow-700 space-y-2">
                  <ul className="list-disc list-inside">
                    <li>清理操作为永久性删除，无法恢复</li>
                    <li>建议在清理前导出或备份重要数据</li>
                    <li>大量标签时，搜索和过滤可以帮助更好地管理</li>
                    <li>如遇到问题，可以尝试手动刷新数据</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">总标签数</h2>
              <FiTag className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
            <p className="mt-4 text-4xl font-bold text-blue-600">{result.totalTags}</p>
            <p className="mt-2 text-sm text-gray-500">所有已创建的标签总数</p>
          </div>
          <div className="bg-gradient-to-br from-white to-red-50 p-6 rounded-xl shadow-sm border border-red-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">孤立标签数</h2>
              <FiAlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
            <p className="mt-4 text-4xl font-bold text-red-600">{result.orphanTags}</p>
            <p className="mt-2 text-sm text-gray-500">未关联任何提示词的标签数量</p>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showOrphanOnly}
              onChange={(e) => setShowOrphanOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">只显示孤立标签</span>
          </label>
        </div>

        {/* 最后更新时间 */}
        <p className="text-sm text-gray-500 mb-4">
          {autoRefresh ? '自动更新已开启 (每30秒)' : ''}
        </p>

        {/* 标签详情列表 */}
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    关联提示词数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTags.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      没有找到匹配的标签
                    </td>
                  </tr>
                ) : (
                  filteredTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiTag className={`flex-shrink-0 h-5 w-5 ${tag.isOrphan ? 'text-red-400' : 'text-green-400'}`} />
                          <span className="ml-2 text-sm font-medium text-gray-900">{tag.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{tag.promptCount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tag.isOrphan 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {tag.isOrphan ? '孤立' : '正常'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
} 