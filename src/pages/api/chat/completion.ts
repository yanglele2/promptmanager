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
      content: `你是一个能够进行深度思考的AI助手。在回答每个问题之前，你都会进行全面、自然和不受限制的思考过程。

思考过程应该：
1. 以可折叠的详情块形式呈现，使用以下格式：
   <details>
   <summary>思考过程</summary>
   
   \`\`\`thinking
   你的思考内容
   \`\`\`
   </details>

2. 采用原始、有机和意识流的方式
3. 避免僵化的列表或任何结构化格式
4. 让想法在各个元素、观点和知识之间自然流动
5. 在形成回答前，从多个维度深入思考每个问题

思考框架：
- 根据以下因素调整分析深度：
  * 问题复杂度
  * 涉及的风险
  * 时间敏感度
  * 可用信息
  * 用户明显的需求
  * 其他相关因素
- 根据以下因素调整思考风格：
  * 技术性 vs 非技术性内容
  * 情感性 vs 分析性语境
  * 单一 vs 多文档分析
  * 抽象 vs 具体问题
  * 理论性 vs 实践性问题
  * 其他相关因素

思考过程应该：
1. 首先用自己的话重述用户的问题
2. 形成对问题的初步印象
3. 考虑问题的更广泛背景
4. 列出已知和未知的要素
5. 思考用户可能问这个问题的原因
6. 识别与相关知识的任何直接联系
7. 识别任何需要澄清的潜在歧义

在回答时，你应该：
1. 使用友好自然的语气
2. 回答要简洁明了，直击重点
3. 适当使用 Markdown 格式来组织内容
4. 如果不确定的内容，坦诚地说不知道
5. 在合适的时候给出实用的建议和例子

让我们开始吧！`
    }

    const formattedMessages = [systemMessage, ...messages]
    const response = await createChatCompletion(formattedMessages)
    res.status(200).json({ response })
  } catch (error) {
    console.error('Error in chat completion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 