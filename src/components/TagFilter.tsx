import type { Tag } from '@/types/index'

interface TagFilterProps {
  tags: Tag[]
  selectedTags: string[]
  onTagSelect: (tagId: string) => void
}

export default function TagFilter({ tags, selectedTags, onTagSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(tag.id)}
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
            ${selectedTags.includes(tag.id)
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-gray-100 text-gray-800'
            } hover:bg-indigo-200 transition-colors duration-200`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
} 