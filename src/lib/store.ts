import create from 'zustand'
import type { PromptWithTags, Tag } from '@/types/index'

interface StoreState {
  prompts: PromptWithTags[]
  tags: Tag[]
  setPrompts: (prompts: PromptWithTags[]) => void
  setTags: (tags: Tag[]) => void
  addPrompt: (prompt: PromptWithTags) => void
  updatePrompt: (prompt: PromptWithTags) => void
  deletePrompt: (id: string) => void
}

export const useStore = create<StoreState>((set) => ({
  prompts: [],
  tags: [],
  setPrompts: (prompts) => set({ prompts }),
  setTags: (tags) => set({ tags }),
  addPrompt: (prompt) =>
    set((state) => ({ prompts: [prompt, ...state.prompts] })),
  updatePrompt: (prompt) =>
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === prompt.id ? prompt : p
      ),
    })),
  deletePrompt: (id) =>
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== id),
    })),
})) 