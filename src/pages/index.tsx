import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Link from 'next/link'
import { FiCommand, FiMessageSquare, FiCopy, FiTag, FiFolder, FiAward, FiTrendingUp, FiUsers } from 'react-icons/fi'
import { motion } from 'framer-motion'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <Layout>
      {/* Hero Section with Animation */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-500 to-blue-500 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-blue-500/90" />
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:20px_20px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl font-extrabold text-white sm:text-6xl md:text-7xl">
              <span className="block">AI提示词管理器</span>
              <span className="block text-indigo-200 text-3xl mt-4">让AI更懂你的需求</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-indigo-100 sm:max-w-3xl">
              专业的提示词管理工具，助你轻松管理和优化AI对话，提升工作效率
            </p>
            <div className="mt-10 flex justify-center space-x-6">
              <Link
                href="/prompts"
                className="transform hover:scale-105 transition-transform duration-200 inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-full text-indigo-700 bg-white hover:bg-indigo-50 shadow-lg"
              >
                立即开始使用
                <FiCommand className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/chat"
                className="transform hover:scale-105 transition-transform duration-200 inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-full text-white hover:bg-white/10"
              >
                体验AI对话
                <FiMessageSquare className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-indigo-600">1000+</div>
              <div className="mt-2 text-lg text-gray-600">精选提示词</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-indigo-600">50+</div>
              <div className="mt-2 text-lg text-gray-600">场景分类</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-indigo-600">24/7</div>
              <div className="mt-2 text-lg text-gray-600">智能助手</div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-extrabold text-gray-900">
                强大功能，简单易用
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                为你提供全方位的AI提示词管理解决方案
              </p>
            </motion.div>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
                <div className="relative p-8 bg-white rounded-xl shadow-xl transition-all duration-300 transform group-hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl">
                    <FiCommand className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">智能提示词管理</h3>
                  <p className="mt-4 text-gray-600">
                    • 快速创建和编辑提示词<br/>
                    • 智能分类和标签管理<br/>
                    • 版本控制和历史记录<br/>
                    • 批量导入导出
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
                <div className="relative p-8 bg-white rounded-xl shadow-xl transition-all duration-300 transform group-hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl">
                    <FiMessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">AI智能对话</h3>
                  <p className="mt-4 text-gray-600">
                    • 自然语言交互<br/>
                    • 多模型支持<br/>
                    • 上下文记忆<br/>
                    • 对话历史保存
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 blur"></div>
                <div className="relative p-8 bg-white rounded-xl shadow-xl transition-all duration-300 transform group-hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl">
                    <FiTrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">效率提升</h3>
                  <p className="mt-4 text-gray-600">
                    • 快捷键支持<br/>
                    • 一键复制运行<br/>
                    • 模板快速调用<br/>
                    • 批量处理
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-4xl font-extrabold text-gray-900">
              使用流程
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              三步开启AI提示词管理之旅
            </p>
          </motion.div>

          <div className="mt-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center"
              >
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-indigo-600 rounded-full">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">创建提示词</h3>
                <p className="mt-4 text-gray-600">
                  使用智能编辑器创建和优化你的AI提示词
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-center"
              >
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-indigo-600 rounded-full">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">分类管理</h3>
                <p className="mt-4 text-gray-600">
                  为提示词添加标签和分类，方便快速查找
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-center"
              >
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-indigo-600 rounded-full">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">一键使用</h3>
                <p className="mt-4 text-gray-600">
                  随时调用你的提示词，与AI进行高效对话
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-blue-500">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:20px_20px]" />
        </div>
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 shadow-2xl"
          >
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                准备好开始使用了吗？
              </h2>
              <p className="mt-4 text-xl text-indigo-100">
                立即体验AI提示词管理的未来
              </p>
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/prompts"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-full text-indigo-600 bg-white hover:bg-indigo-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                免费开始使用
                <FiCommand className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
} 