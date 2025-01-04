// Database types
export type Database = {
  public: {
    Tables: {
      prompts: {
        Row: {
          id: string
          title: string
          content: string
          description: string | null
          language: string | null
          purpose: string | null
          created_at: string
          updated_at: string
          user_id: string | null
          is_private: boolean
        }
        Insert: {
          title: string
          content: string
          description?: string | null
          language?: string | null
          purpose?: string | null
          is_private?: boolean
          user_id?: string | null
        }
        Update: {
          title?: string
          content?: string
          description?: string | null
          language?: string | null
          purpose?: string | null
          is_private?: boolean
          user_id?: string | null
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          name: string
          user_id?: string | null
        }
        Update: {
          name?: string
          user_id?: string | null
        }
      }
      prompt_tags: {
        Row: {
          prompt_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          prompt_id: string
          tag_id: string
        }
        Update: {
          prompt_id?: string
          tag_id?: string
        }
      }
      folders: {
        Row: {
          id: string
          name: string
          description: string | null
          user_id: string | null
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          user_id?: string | null
          parent_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          parent_id?: string | null
        }
      }
      prompt_folders: {
        Row: {
          prompt_id: string
          folder_id: string
          created_at: string
        }
        Insert: {
          prompt_id: string
          folder_id: string
        }
        Update: {
          prompt_id?: string
          folder_id?: string
        }
      }
    }
  }
}

// Input types
export type PromptInput = {
  title: string
  content: string
  description?: string | null
  language?: string | null
  purpose?: string | null
  is_private: boolean
}

// Entity types
export type Tag = {
  id: string
  name: string
  user_id?: string | null
  created_at?: string
}

export type Prompt = {
  id: string
  title: string
  content: string
  description: string | null
  language: string | null
  purpose: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  is_private: boolean
  folder_id?: string
}

export type PromptTag = {
  tags: Tag
}

export type PromptWithTags = Prompt & {
  prompt_tags?: PromptTag[]
  prompt_folders?: Array<{
    folder_id: string
  }>
}

export type Folder = {
  id: string
  name: string
  description: string | null
  user_id: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
}

export type PromptFolder = {
  prompt_id: string
  folder_id: string
  created_at: string
}

export interface Chat {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
} 