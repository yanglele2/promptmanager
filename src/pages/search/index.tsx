import { useState, useEffect } from 'react'
import { FiSearch, FiInfo, FiTag, FiArrowRight, FiClock, FiArrowLeft } from 'react-icons/fi'
import Layout from '@/components/Layout'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

interface SearchResult {
  id: string
  title: string
  description: string
  content: string
  tags: string[]
  score: number
  reason?: string
}

interface SearchHistory {
  id: string
  query: string
  results: SearchResult[]
  created_at: string
}

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SmartSearch() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // 初始化时获取用户状态
  useEffect(() => {
    const getInitialUser = async () => {
      const { data: { user: initialUser } } = await supabase.auth.getUser()
      setUser(initialUser)
    }
    getInitialUser()

    // 监听用户状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 加载搜索历史
  useEffect(() => {
    if (user) {
      loadSearchHistory()
    }
  }, [user])

  const loadSearchHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setSearchHistory(data)
    } catch (error) {
      console.error('加载搜索历史失败:', error)
      toast.error('加载搜索历史失败')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 保存搜索历史
  const saveSearchHistory = async (query: string, results: SearchResult[]) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('search_history')
        .insert([
          {
            user_id: user.id,
            query,
            results,
          },
        ])

      if (error) throw error
      
      // 刷新搜索历史
      loadSearchHistory()
    } catch (error) {
      console.error('保存搜索历史失败:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return
    setIsSearching(true)
    setSearchResults([])

    try {
      const response = await fetch('/api/search/smart-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchTerm }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '搜索失败')
      }

      setSearchResults(data.matches)
      // 保存搜索历史
      await saveSearchHistory(searchTerm, data.matches)
    } catch (error) {
      console.error('搜索失败:', error)
      toast.error('搜索失败，请稍后重试')
    } finally {
      setIsSearching(false)
    }
  }

  // 搜索建议示例
  const searchExamples = [
    '如何写一个吸引人的产品介绍',
    '生成一个英文学术论文大纲',
    '如何写一个有效的销售邮件',
    '总结这篇技术文档的要点',
  ]

  // 返回搜索主页
  const handleBack = () => {
    setSearchResults([])
    setSearchTerm('')
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {searchResults.length > 0 ? (
          <div className="mb-8">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />
              <span>返回搜索</span>
            </button>
          </div>
        ) : (
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">智能搜索</h1>
            <p className="text-xl text-gray-600 mb-4">
              使用自然语言描述您的需求，我们将为您找到最相关的提示词
            </p>
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
              <FiInfo className="w-4 h-4" />
              <span>支持多样化的搜索方式，例如任务描述、场景需求、问题咨询等</span>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="请输入您要搜索的内容..."
                className="w-full px-4 py-3 pl-12 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
              />
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchTerm.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
            >
              {isSearching ? '搜索中...' : '开始搜索'}
            </button>
          </div>

          {/* 搜索建议 */}
          {searchResults.length === 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">搜索建议</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchExamples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchTerm(example)}
                    className="text-left p-3 text-gray-600 hover:bg-gray-50 rounded-md transition-colors border border-gray-100 hover:border-gray-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 搜索结果 */}
          <div className="mt-8 space-y-4">
            {isSearching && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-4 text-gray-600">正在分析您的需求...</p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  为您找到 {searchResults.length} 个相关提示词
                </h2>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {result.title}
                        </h3>
                        <p className="text-gray-600 mb-4">{result.description}</p>
                        {result.reason && (
                          <p className="text-sm text-gray-500 mb-4">
                            匹配原因: {result.reason}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {result.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <FiTag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-500">
                            匹配度
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {result.score}%
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/prompts/${result.id}`)}
                          className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="查看详情"
                        >
                          <FiArrowRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchTerm && (
              <div className="text-center py-12 text-gray-500">
                未找到相关提示词，请尝试其他搜索词
              </div>
            )}
          </div>
        </div>

        {/* 搜索历史 */}
        {user && searchHistory.length > 0 && !searchResults.length && (
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FiClock className="w-5 h-5" />
              最近的搜索
            </h2>
            <div className="space-y-4">
              {searchHistory.map((history) => (
                <div
                  key={history.id}
                  className="p-4 hover:bg-gray-50 rounded-md cursor-pointer border border-gray-100"
                  onClick={() => {
                    setSearchTerm(history.query)
                    setSearchResults(history.results)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 font-medium">{history.query}</p>
                      <p className="text-sm text-gray-500">
                        找到 {history.results.length} 个结果 · {new Date(history.created_at).toLocaleString()}
                      </p>
                    </div>
                    <FiArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 