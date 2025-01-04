import { NextApiRequest, NextApiResponse } from 'next'
import { createChatCompletion } from '@/lib/deepseek'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const messages = [
      {
        role: 'system',
        content: '你是一个标题生成助手。请根据用户的对话内容生成一个简短的标题（不超过20个字）。标题应该简洁且能反映对话的主要内容。'
      },
      {
        role: 'user',
        content: `请为这段对话生成标题：${content}`
      }
    ]

    const title = await createChatCompletion(messages)
    res.status(200).json({ title: title.trim() })
  } catch (error) {
    console.error('Error generating title:', error)
    res.status(500).json({ error: 'Failed to generate title' })
  }
} 