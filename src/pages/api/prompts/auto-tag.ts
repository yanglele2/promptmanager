import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

async function generateTags(title: string, content: string): Promise<string[]> {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API 密钥未配置')
  }

  try {
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
    return tagsText.split(',').map((tag: string) => tag.trim())
  } catch (error) {
    console.error('Error calling DeepSeek API:', error)
    throw error
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' })
  }

  try {
    const { promptId } = req.body
    if (!promptId) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    // 获取提示词信息
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single()

    if (promptError || !prompt) {
      console.error('获取提示词失败:', promptError)
      return res.status(404).json({ error: '提示词不存在' })
    }

    // 生成标签
    const tagNames = await generateTags(prompt.title, prompt.content)
    const savedTags = []

    // 保存标签
    for (const tagName of tagNames) {
      try {
        // 1. 尝试创建或获取标签
        const { data: tag, error: tagError } = await supabase
          .from('tags')
          .upsert({ name: tagName }, { onConflict: 'name' })
          .select()
          .single()

        if (tagError) {
          console.error('处理标签失败:', tagError)
          continue
        }

        // 2. 创建提示词和标签的关联
        const { error: linkError } = await supabase
          .from('prompt_tags')
          .upsert({
            prompt_id: promptId,
            tag_id: tag.id
          }, {
            onConflict: 'prompt_id,tag_id'
          })

        if (linkError) {
          console.error('关联标签失败:', linkError)
          continue
        }

        savedTags.push(tag)
      } catch (error) {
        console.error(`处理标签 "${tagName}" 时出错:`, error)
      }
    }

    return res.status(200).json({ success: true, tags: savedTags })
  } catch (error: any) {
    console.error('自动打标签失败:', error)
    return res.status(500).json({ error: error.message || '服务器错误' })
  }
} 