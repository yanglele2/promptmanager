import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@/lib/supabase'
import { analyzeSearchIntent, Prompt } from '@/lib/deepseek-search'

interface Tag {
  id: string
  name: string
}

interface DBPrompt {
  id: string
  title: string
  description: string
  content: string
  tags: Tag[]
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' })
  }

  try {
    const { query } = req.body

    if (!query?.trim()) {
      return res.status(400).json({ error: '搜索词不能为空' })
    }

    // 1. 获取所有提示词
    const supabase = createClient()
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select(`
        id,
        title,
        description,
        content,
        tags (
          id,
          name
        )
      `)

    if (promptsError) {
      throw promptsError
    }

    if (!prompts) {
      throw new Error('未找到任何提示词')
    }

    // 2. 格式化提示词数据
    const formattedPrompts: Prompt[] = prompts.map((prompt: DBPrompt) => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      tags: prompt.tags?.map(tag => tag.name) || []
    }))

    // 3. 调用 Deepseek 进行分析和匹配
    const matches = await analyzeSearchIntent(query, formattedPrompts)

    // 4. 返回结果
    return res.status(200).json({ matches })

  } catch (error) {
    console.error('智能搜索失败:', error)
    return res.status(500).json({ error: '搜索失败，请稍后重试' })
  }
}

export default handler 