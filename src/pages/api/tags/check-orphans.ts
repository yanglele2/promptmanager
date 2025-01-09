import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' })
  }

  try {
    console.log('开始检查标签状态...')
    
    // 1. 获取所有标签
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name')
      .order('name')

    if (tagsError) {
      console.error('获取标签失败:', tagsError)
      throw tagsError
    }
    console.log('获取到标签数量:', tags?.length || 0)

    // 2. 获取所有标签-提示词关联
    const { data: promptTags, error: promptTagsError } = await supabase
      .from('prompt_tags')
      .select('tag_id, prompt_id')

    if (promptTagsError) {
      console.error('获取标签关联失败:', promptTagsError)
      throw promptTagsError
    }
    console.log('获取到标签关联数量:', promptTags?.length || 0)

    // 3. 分析结果
    const tagStats = tags.map(tag => {
      const associatedPrompts = promptTags.filter(pt => pt.tag_id === tag.id)
      return {
        id: tag.id,
        name: tag.name,
        promptCount: associatedPrompts.length,
        isOrphan: associatedPrompts.length === 0
      }
    })

    const orphanCount = tagStats.filter(t => t.isOrphan).length
    console.log('分析结果:', {
      totalTags: tags.length,
      orphanTags: orphanCount,
      orphanTagNames: tagStats.filter(t => t.isOrphan).map(t => t.name)
    })

    // 4. 统计信息
    const summary = {
      totalTags: tags.length,
      orphanTags: orphanCount,
      tagDetails: tagStats.sort((a, b) => {
        // 首先按照状态排序（孤立的排在前面）
        if (a.isOrphan !== b.isOrphan) {
          return a.isOrphan ? -1 : 1
        }
        // 然后按照关联数量升序
        if (a.promptCount !== b.promptCount) {
          return a.promptCount - b.promptCount
        }
        // 最后按照名称排序
        return a.name.localeCompare(b.name)
      })
    }

    return res.status(200).json(summary)
  } catch (error: any) {
    console.error('检查标签失败:', error)
    return res.status(500).json({ error: error.message || '服务器错误' })
  }
} 