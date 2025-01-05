import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { title, content } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' })
    }

    const systemPrompt = `根据提示词的标题和内容，理解和分析提示词的作用，并且进行详细描述，目的是直观了解提示词的作用和功能，但不要超过150个字。`

    const userPrompt = `标题：${title}\n内容：${content}\n请生成描述：`

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error('调用AI接口失败')
    }

    const data = await response.json()
    const description = data.choices[0].message.content.trim()

    res.status(200).json({ description })
  } catch (error: any) {
    console.error('Generate description error:', error)
    res.status(500).json({ error: error.message || '生成描述失败' })
  }
} 