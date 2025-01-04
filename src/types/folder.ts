export interface Folder {
  id: string
  name: string
  description?: string | null
  user_id: string
  parent_id?: string | null
  created_at: string
  updated_at: string
}

export interface PromptFolder {
  prompt_id: string
  folder_id: string
  created_at: string
} 