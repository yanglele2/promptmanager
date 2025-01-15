import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
})

export interface Prompt {
  id: string
  title: string
  description: string
  content: string
  tags: string[]
}

export interface PromptMatch extends Prompt {
  score: number
  reason: string
}

interface DeepseekMatch {
  promptId: string
  score: number
  reason: string
}

interface DeepseekResponse {
  matches: DeepseekMatch[]
}

export async function analyzeSearchIntent(query: string, prompts: Prompt[]): Promise<PromptMatch[]> {
  try {
    // 1. 使用 Deepseek 分析用户意图
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的提示词匹配助手。分析用户搜索词，从已有提示词中找出最相关的内容。返回JSON格式，包含匹配的提示词ID、匹配度评分(0-100)和匹配原因。'
        },
        {
          role: 'user',
          content: `请分析以下用户搜索词，并从提示词列表中找出最相关的内容。
请以 JSON 格式返回结果，格式如下：
{
  "matches": [
    {
      "promptId": "提示词ID",
      "score": 匹配度评分,
      "reason": "匹配原因描述"
    }
  ]
}

用户搜索词: "${query}"

可用的提示词列表:
${prompts.map(p => `ID: ${p.id}
标题: ${p.title}
描述: ${p.description}
内容: ${p.content}
标签: ${p.tags.join(', ')}
---`).join('\n')}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('Deepseek API 返回内容为空')
    }

    // 2. 解析返回结果
    const result = JSON.parse(content) as DeepseekResponse
    
    // 3. 整理匹配结果
    const matches: PromptMatch[] = []
    
    for (const match of result.matches) {
      const prompt = prompts.find(p => p.id === match.promptId)
      if (prompt) {
        matches.push({
          ...prompt,
          score: match.score,
          reason: match.reason
        })
      }
    }

    // 4. 按匹配度排序
    return matches.sort((a, b) => b.score - a.score)

  } catch (error) {
    console.error('Deepseek API 调用失败:', error)
    throw error
  }
} 