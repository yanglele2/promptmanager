import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' })
  }

  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API 密钥未配置')
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的提示词分析助手，请分析提供的提示词标题和内容，生成3-5个相关的标签。标签应该简洁且具有描述性，每个标签不超过2个词。请只返回标签列表，用逗号分隔。'
          },
          {
            role: 'user',
            content: `标题：${title}\n内容：${content}`
          }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '调用 DeepSeek API 失败')
    }

    const data = await response.json()
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('DeepSeek API 返回格式错误')
    }
    
    const tagsText = data.choices[0].message.content
    const tags = tagsText.split(',').map((tag: string) => tag.trim())

    return res.status(200).json({ tags })
  } catch (error: any) {
    console.error('生成标签失败:', error)
    return res.status(500).json({ error: error.message || '服务器错误' })
  }
} 