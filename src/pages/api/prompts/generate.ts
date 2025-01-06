import { NextApiRequest, NextApiResponse } from 'next'
import { DifyClient } from '../../../lib/dify'

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

    const DIFY_API_KEY = process.env.DIFY_API_KEY
    if (!DIFY_API_KEY) {
      throw new Error('Dify API 密钥未配置')
    }

    const client = new DifyClient(DIFY_API_KEY)
    const query = `请帮我生成一个AI提示词。
要求：
1. 标题：简短且能概括提示词的用途
2. 内容：详细的提示词内容，包含完整的指令和要求
3. 描述：对这个提示词的简要说明，不超过100字

用户需求：${description}

请严格按照以下格式返回：
标题：[标题内容]
内容：[提示词内容]
描述：[描述内容]`

    let response = ''
    let title = ''
    let content = ''
    let promptDescription = ''

    await new Promise<void>((resolve, reject) => {
      client.chat(
        query,
        '',
        'generate_prompt',
        {},
        (message) => {
          try {
            if (message.startsWith('{')) {
              // 如果是 JSON 字符串，说明是最终结果
              const result = JSON.parse(message)
              title = result.title
              content = result.content
              promptDescription = result.description
            } else {
              response += message
              console.log('收到消息:', message)
              
              // 尝试从累积的响应中解析
              const titleMatch = response.match(/标题：([\s\S]*?)(?=\n内容：|$)/)
              const contentMatch = response.match(/内容：([\s\S]*?)(?=\n描述：|$)/)
              const descriptionMatch = response.match(/描述：([\s\S]*?)$/)

              if (titleMatch) title = titleMatch[1].trim()
              if (contentMatch) content = contentMatch[1].trim()
              if (descriptionMatch) promptDescription = descriptionMatch[1].trim()
            }
          } catch (error) {
            console.error('处理消息失败:', error)
          }
        }
      ).then(resolve).catch((error) => {
        console.error('Chat error:', error)
        reject(error)
      })
    })

    if (!title || !content) {
      console.error('生成的提示词:', response)
      throw new Error('生成的提示词格式不正确')
    }

    // 返回生成的提示词
    return res.status(200).json({
      title,
      content,
      description: promptDescription || '',
      type: 'manual',
      source: 'dify',
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