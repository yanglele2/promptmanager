import { NextApiRequest, NextApiResponse } from 'next'
import { createChatCompletion } from '../../../lib/deepseek'

interface GeneratePromptResponse {
  title: string
  content: string
  description: string
  type: string
  source: string
  language: string
  category: string
  tags: string[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeneratePromptResponse | { error: string; details?: string }>
) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' })
  }

  try {
    const { description } = req.body
    if (!description) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API 密钥未配置')
    }

    const query = `# 角色
你是一个专业的提示词工程师，擅长设计结构化、清晰且高效的AI提示词。

# 背景
每个提示词都需要清晰的结构和明确的指令，以确保AI能够准确理解并执行用户的意图。

# 目标
根据用户需求，生成一个结构完整、逻辑清晰的提示词。

# 技能
1. 深入分析用户需求，提取核心目标
2. 设计清晰的指令结构和约束条件
3. 优化提示词的可执行性和可理解性
4. 确保提示词简洁而全面

# 任务
基于以下用户需求，生成一个专业的提示词：
${description}

# 输出要求
请严格按照以下格式输出：

标题：[简短且能概括提示词用途的标题]

内容：[结构化的提示词内容，包含：
- 角色定义（如适用）
- 背景说明（如适用）
- 具体任务要求
- 输出格式或示例（如适用）
- 质量标准或限制（如适用）]

描述：[100字以内的简要说明，解释这个提示词的用途和特点]

注意：
1. 标题要简洁有力，直观表达用途
2. 内容要结构清晰，层次分明
3. 描述要突出提示词的关键特点和应用场景`

    const response = await createChatCompletion([
      { role: 'user', content: query }
    ])

    // 从响应中解析标题、内容和描述
    const titleMatch = response.match(/标题：([\s\S]*?)(?=\n内容：|$)/)
    const contentMatch = response.match(/内容：([\s\S]*?)(?=\n描述：|$)/)
    const descriptionMatch = response.match(/描述：([\s\S]*?)$/)

    if (!titleMatch || !contentMatch) {
      console.error('生成的提示词:', response)
      throw new Error('生成的提示词格式不正确')
    }

    const title = titleMatch[1].trim()
    const content = contentMatch[1].trim()
    const promptDescription = descriptionMatch ? descriptionMatch[1].trim() : ''

    // 返回生成的提示词
    return res.status(200).json({
      title,
      content,
      description: promptDescription,
      type: 'manual',
      source: 'deepseek',
      language: 'zh',
      category: 'general',
      tags: []
    })
  } catch (error: any) {
    console.error('生成提示词失败:', error)
    return res.status(500).json({ 
      error: error.message || '服务器错误',
      details: error.stack
    })
  }
} 