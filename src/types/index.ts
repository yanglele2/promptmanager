// 基础类型
export interface Tag {
  id: string
  name: string
  user_id?: string
}

export interface Folder {
  id: string
  name: string
  description?: string | null
  user_id: string
  parent_id?: string | null
  created_at: string
  updated_at: string
}

// 提示词相关类型
export interface Prompt {
  id: string
  title: string
  content: string
  description: string
  created_at: string
  folder_id: string | null
  user_id?: string
  language?: string | null
  purpose?: string | null
}

export interface PromptTag {
  tags: Tag
}

export interface PromptWithTags extends Prompt {
  prompt_tags?: PromptTag[]
}

export interface PromptFolder {
  prompt_id: string
  folder_id: string
  created_at: string
}

export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message?: string
  user_id: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// 重新导出所有类型
export * from './folder' 