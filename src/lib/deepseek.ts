interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  content: string
}

export class DeepSeek {
  private apiKey: string
  private baseUrl = 'https://api.deepseek.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  // 获取API密钥
  getApiKey() {
    return this.apiKey
  }

  async chat({ messages }: { messages: Message[] }): Promise<ChatResponse> {
    try {
      console.log('API Key 前几位:', this.apiKey.substring(0, 5) + '...')
      
      // 确保API密钥格式正确 - DeepSeek可能要求没有'Bearer '前缀
      const apiKeyValue = this.apiKey.startsWith('sk-') ? this.apiKey : `sk-${this.apiKey}`
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyValue}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.3,
          response_format: { type: 'text' } // 改为text格式以避免可能的解析问题
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`)
      }

      try {
        const data = await response.json()
        // 兼容不同的响应格式
        if (data.choices && data.choices[0]) {
          if (data.choices[0].message) {
            return {
              content: data.choices[0].message.content
            }
          } else if (data.choices[0].text) {
            return {
              content: data.choices[0].text
            }
          }
        }
        
        // 如果无法解析标准格式，尝试直接返回原始数据
        console.log('API响应并非标准格式，返回原始数据:', data)
        return {
          content: JSON.stringify(data)
        }
      } catch (jsonError) {
        // 如果无法作为JSON解析，尝试读取原始文本
        console.log('无法将响应解析为JSON，读取原始文本')
        const text = await response.text()
        return {
          content: text
        }
      }
    } catch (error) {
      console.error('DeepSeek chat error:', error)
      throw error
    }
  }
}

// 创建DeepSeek实例
const apiKey = process.env.DEEPSEEK_API_KEY
console.log('DeepSeek API Key available:', !!apiKey)

if (!apiKey) {
  console.warn('DEEPSEEK_API_KEY环境变量未设置，请在.env.local文件中配置')
}

const deepseek = new DeepSeek(apiKey || '')

// 导出createChatCompletion函数供API使用
export async function createChatCompletion(messages: Message[]): Promise<string> {
  // 检查是否有API密钥
  if (!apiKey || apiKey.trim() === '') {
    console.warn('缺少DeepSeek API密钥，使用模拟模式代替')
    
    // 模拟模式 - 当API密钥不可用时返回预设回复
    const userMessage = messages.find(m => m.role === 'user')?.content || ''
    console.log('用户消息:', userMessage)
    
    // 根据用户输入生成简单回应
    return `我已收到您的消息: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"

很抱歉，目前我处于模拟模式，无法提供完整的响应。这可能是因为 DeepSeek API 密钥缺失或无效。

请检查您的 .env.local 文件并确保DEEPSEEK_API_KEY变量正确设置。`
  }
  
  // 当API密钥有效时，尝试调用真实API
  try {
    console.log('正在调用DeepSeek API...')
    const response = await deepseek.chat({ messages })
    return response.content
  } catch (error) {
    console.error('Chat completion error:', error)
    
    // 包装错误消息，使其对用户更友好
    const errorMessage = error instanceof Error ? error.message : String(error)
    return `很抱歉，调用AI接口时出现错误: ${errorMessage}

请检查您的API密钥是否有效，或稍后再试。`
  }
}