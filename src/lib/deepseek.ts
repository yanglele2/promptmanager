const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_BASE_URL = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function createChatCompletion(messages: ChatMessage[]) {
  try {
    const response = await fetch(`${DEEPSEEK_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // 增强的格式化处理
    let formattedContent = content
      // 标准化标题格式
      .replace(/^(#{2,3})\s*([^\n]+)/gm, '\n$1 $2\n')
      // 标准化加粗格式
      .replace(/\*\*([^*]+)\*\*/g, '**$1**')
      // 标准化方括号格式
      .replace(/\[([^\]]+)\]/g, '[$1]')
      // 标准化列表格式
      .replace(/^(\s*)[*-](\s+)/gm, '$1* ')
      .replace(/^(\s*)\d+\.(\s+)/gm, '$1$1. ')
      // 标准化缩进
      .replace(/^(\s{2,})/gm, '   ')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      // 确保代码块格式
      .replace(/^```([^\n]*)\n([\s\S]*?)```$/gm, '\n```$1\n$2\n```\n')
      // 清理首尾空白
      .trim()

    // 确保段落之间有一个空行
    formattedContent = formattedContent
      .split('\n')
      .reduce((acc: string, line: string, i: number, arr: string[]) => {
        if (i === 0) return line
        if (line.trim() === '' && arr[i-1].trim() === '') return acc
        return acc + '\n' + line
      }, '')

    return formattedContent
  } catch (error) {
    console.error('Error calling Deepseek API:', error)
    throw error
  }
} 