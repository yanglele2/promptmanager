export class DifyClient {
  private apiKey: string
  private baseUrl: string
  private headers: Record<string, string>

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = 'http://agent.promptnest.cn/v1'
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  }

  async chat(
    query: string, 
    conversationId: string = '', 
    user: string = 'default_user',
    inputs: Record<string, any> = {},
    onMessage?: (message: string) => void
  ): Promise<void> {
    const endpoint = `${this.baseUrl}/chat-messages`
    const payload = {
      query,
      response_mode: 'streaming',
      conversation_id: conversationId,
      user,
      inputs: inputs || {}
    }

    try {
      console.log('Request:', {
        url: endpoint,
        headers: this.headers,
        body: payload
      })

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Request failed: ${response.status} ${errorText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))
            console.log('Received event:', data)

            if (data.event === 'message' || data.event === 'agent_message') {
              const answer = data.answer || ''
              if (answer) {
                fullResponse += answer
                if (onMessage) {
                  onMessage(answer)
                }
              }
            } else if (data.event === 'error') {
              console.error('Stream error:', data)
              throw new Error(data.message || 'Unknown error')
            } else if (data.event === 'message_end') {
              console.log('Stream ended:', data)
              if (onMessage && fullResponse) {
                // 解析完整响应
                const titleMatch = fullResponse.match(/标题：([\s\S]*?)(?=\n内容：|$)/)
                const contentMatch = fullResponse.match(/内容：([\s\S]*?)(?=\n描述：|$)/)
                const descriptionMatch = fullResponse.match(/描述：([\s\S]*?)$/)

                if (titleMatch && contentMatch) {
                  const result = {
                    title: titleMatch[1].trim(),
                    content: contentMatch[1].trim(),
                    description: descriptionMatch ? descriptionMatch[1].trim() : ''
                  }
                  onMessage(JSON.stringify(result))
                }
              }
              return
            }
          } catch (e) {
            console.error('Parse error:', e, line)
            if (onMessage && line.slice(6)) {
              onMessage(line.slice(6))
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      throw error
    }
  }
} 