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

  async chat({ messages }: { messages: Message[] }): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        content: data.choices[0].message.content
      }
    } catch (error) {
      console.error('DeepSeek chat error:', error)
      throw error
    }
  }
} 