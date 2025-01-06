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
    const { messages } = req.body

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' })
    }

    const systemMessage = {
      role: 'system',
      content: `你是一个格式化助手，请严格按照以下格式规范输出内容：

1. 标题格式：
   - 使用 ## 作为二级标题
   - 使用 ### 作为三级标题
   - 标题前后要有空行

2. 文本格式：
   - 使用 ** 加粗重要内容
   - 使用 [] 表示占位符
   - 使用 * 作为无序列表
   - 使用数字. 作为有序列表
   - 段落之间使用一个空行分隔
   - 列表项之间不加空行

3. 特殊要求：
   - 保持缩进一致性
   - 确保标点符号使用正确
   - 避免重复的空行
   - 列表层级使用三个空格缩进
   - 代码块使用 \`\`\` 包裹

请确保输出的内容严格遵循以上格式规范。`
    }

    const formattedMessages = [systemMessage, ...messages]
    const response = await createChatCompletion(formattedMessages)
    res.status(200).json({ response })
  } catch (error) {
    console.error('Error in chat completion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 