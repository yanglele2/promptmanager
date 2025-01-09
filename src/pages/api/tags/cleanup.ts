import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

interface OrphanTag {
  id: string
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' })
  }

  try {
    console.log('开始清理孤立标签...')

    // 1. 使用原生 SQL 查询找出孤立标签
    const { data: orphanTags, error: findError } = await supabase
      .rpc('find_orphan_tags') as { data: OrphanTag[] | null, error: any }

    if (findError) {
      console.error('查找孤立标签失败:', findError)
      throw findError
    }

    if (!orphanTags?.length) {
      console.log('没有发现孤立标签')
      return res.status(200).json({
        message: '没有发现孤立标签',
        deletedCount: 0
      })
    }

    console.log('发现孤立标签:', orphanTags)

    // 2. 使用原生 SQL 删除孤立标签
    const orphanTagIds = orphanTags.map(tag => tag.id)
    const { data: deletedTags, error: deleteError } = await supabase
      .rpc('delete_orphan_tags', { tag_ids: orphanTagIds })

    if (deleteError) {
      console.error('删除标签失败:', deleteError)
      throw deleteError
    }

    console.log('已删除标签:', deletedTags)

    // 3. 获取最终结果
    const { count: finalCount, error: countError } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('获取最终标签数量失败:', countError)
    }

    return res.status(200).json({
      message: '清理完成',
      deletedCount: orphanTags.length,
      deletedTags: orphanTags,
      finalCount
    })

  } catch (error: any) {
    console.error('清理标签失败:', error)
    return res.status(500).json({
      error: '清理失败，请重试',
      details: error.message
    })
  }
} 