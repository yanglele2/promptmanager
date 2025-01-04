export interface Tag {
  id: string
  name: string
  user_id?: string
  created_at?: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  description?: string
  language?: string
  purpose?: string
  created_at: string
  updated_at?: string
  user_id?: string
  prompt_tags?: {
    tags: Tag
  }[]
} 