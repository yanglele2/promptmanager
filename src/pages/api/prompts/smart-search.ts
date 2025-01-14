import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { DeepSeek } from '@/lib/deepseek'

interface MatchResult {
  id: string
  score: number
  detail_scores?: {
    domain: number
    function: number
    scenario: number
    quality: number
    intent?: number
    content?: number
  }
}

interface DetailedMatchResult {
  id: string
  total_score: number
  scores: {
    intent: number
    domain: number
    content: number
    scenario: number
  }
}

interface Prompt {
  id: string
  title: string
  content: string
  description: string
  prompt_tags?: Array<{
    tags: {
      id: string
      name: string
    }
  }>
}

interface PromptTag {
  tags: {
    id: string
    name: string
  }
}

interface MatchDetails {
  score: number
  domain_match: boolean
  detail_scores: {
    domain: number
    function: number
    scenario: number
    quality: number
  }
}

interface MatchedPrompt {
  id: string
  title: string
  description: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
  is_private: boolean
  tags: Array<{ id: string; name: string }>
  use_count: number
  is_favorite: boolean
  match_score: number
  matching_details: {
    score: number
    domain_match: boolean
    detail_scores: {
      domain: number
      function: number
      scenario: number
      quality: number
    }
  }
}

interface ParsedMatch {
  id: string
  total_score?: number
  score?: number
  scores?: {
    domain: number
    function: number
    scenario: number
    quality: number
  }
  detail_scores?: {
    domain: number
    function: number
    scenario: number
    quality: number
  }
}

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 初始化 DeepSeek 客户端
const deepseek = new DeepSeek(process.env.DEEPSEEK_API_KEY!)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    // 1. 调用 DeepSeek 进行意图识别和语义分析
    const systemPrompt = `你是一个专业的提示词分析专家。请对用户的搜索需求进行深入分析，提取关键信息。

分析维度：
1. 核心需求：
   - 用户想要解决什么问题
   - 期望达到什么效果
   - 有什么具体场景

2. 关键要素：
   - 必要条件（必须满足的要求）
   - 可选条件（优先考虑但非必须）
   - 限制条件（使用场景的限制）

3. 领域特征：
   - 专业领域（如写作、编程、设计等）
   - 技术要求（如使用的工具、技术等）
   - 专业程度（入门级、专业级等）

4. 输出期望：
   - 输出类型（文本、代码、图片等）
   - 质量要求（准确度、完整性等）
   - 风格要求（正式、创意等）

请用 JSON 格式返回分析结果：
{
  "core_needs": {
    "problem": "要解决的核心问题",
    "goal": "期望达到的效果",
    "scenario": "应用场景"
  },
  "key_elements": {
    "required": ["必要条件1", "必要条件2"],
    "optional": ["可选条件1", "可选条件2"],
    "limitations": ["限制条件1", "限制条件2"]
  },
  "domain": {
    "field": "专业领域",
    "tech_requirements": ["技术要求1", "技术要求2"],
    "expertise_level": "专业程度"
  },
  "output": {
    "type": "输出类型",
    "quality": ["质量要求1", "质量要求2"],
    "style": "风格要求"
  }
}`

    const userMessage = `请深入分析这个搜索需求：${query}`

    const analysis = await deepseek.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })

    let searchCriteria
    try {
      searchCriteria = JSON.parse(analysis.content)
    } catch (e) {
      console.error('DeepSeek response parsing error:', e)
      searchCriteria = {
        core_needs: {
          problem: query,
          goal: query,
          scenario: "通用场景"
        }
      }
    }

    // 2. 从数据库获取所有提示词
    const { data: allPrompts, error: promptsError } = await supabase
      .from('prompts')
      .select('*, prompt_tags(tags(id, name))')
      .order('created_at', { ascending: false })

    if (promptsError) {
      throw promptsError
    }

    if (!allPrompts || allPrompts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          analysis: searchCriteria,
          results: [],
          message: '提示词库中暂无内容'
        }
      })
    }

    // 3. 使用 DeepSeek 进行智能匹配
    const matchingPrompt = `作为一个专业的提示词匹配专家，请根据用户的搜索意图，从提供的提示词列表中找出最相关的提示词。

用户搜索意图分析结果：
${JSON.stringify(searchCriteria, null, 2)}

提示词列表：
${JSON.stringify(allPrompts, null, 2)}

匹配规则：
1. 核心需求匹配（40分）
- 问题解决能力（20分）：提示词是否能解决用户的核心问题
- 目标达成度（10分）：提示词是否能帮助用户达到预期效果
- 场景适用性（10分）：提示词是否适用于用户的具体场景

2. 领域专业度（30分）
- 领域匹配度（15分）：提示词的专业领域是否匹配
- 技术要求（10分）：是否满足用户的技术需求
- 专业水平（5分）：专业程度是否符合用户要求

3. 质量评估（30分）
- 完整性（10分）：提示词的结构和内容是否完整
- 可用性（10分）：提示词是否容易理解和使用
- 可靠性（10分）：提示词的质量和效果是否可靠

筛选标准：
1. 总分低于70分的提示词将被排除
2. 核心需求匹配得分低于25分的提示词将被排除
3. 领域专业度得分低于15分的提示词将被排除

请返回JSON格式的匹配结果：
{
  "results": [
    {
      "id": "提示词ID",
      "total_score": 85,
      "scores": {
        "core_needs": 35,
        "domain": 25,
        "quality": 25
      },
      "matching_details": {
        "strength": ["优势1", "优势2"],
        "weakness": ["不足1", "不足2"]
      }
    }
  ]
}`

    const matchResult = await deepseek.chat({
      messages: [
        { 
          role: 'system', 
          content: '你是一个提示词匹配专家。请严格按照评分标准进行匹配，确保返回的结果真正满足用户需求。对于不相关的提示词，要坚决排除。如果没有合适的匹配，要给出有针对性的建议。' 
        },
        { role: 'user', content: matchingPrompt }
      ]
    })

    console.log('Raw DeepSeek response:', matchResult.content)

    let matches: MatchResult[] = []
    try {
      let parsedContent
      try {
        parsedContent = JSON.parse(matchResult.content)
      } catch (e) {
        const jsonMatch = matchResult.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法解析匹配结果')
        }
      }

      if (!parsedContent.results || parsedContent.results.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            analysis: searchCriteria,
            results: [],
            message: parsedContent.suggestion || '未找到完全匹配的提示词，建议：\n1. 尝试更具体地描述您的需求\n2. 考虑放宽一些限制条件\n3. 使用不同的关键词重试'
          }
        })
      }

      matches = parsedContent.results.map((m: any) => ({
        id: m.id,
        score: m.total_score,
        detail_scores: {
          domain: m.scores.domain || 0,
          function: m.scores.core_needs || 0,
          scenario: m.scores.quality || 0,
          quality: Math.round((m.scores.domain + m.scores.core_needs + m.scores.quality) / 3)
        }
      }))

      // 验证匹配结果的有效性
      matches = matches.filter(m => 
        m && 
        typeof m.id === 'string' && 
        typeof m.score === 'number' && 
        m.score >= 70
      )

      console.log('Parsed matches:', matches)

    } catch (e) {
      console.error('Match result parsing error:', e)
      console.error('Raw match result:', matchResult.content)
      matches = []
    }

    // 4. 构造匹配结果
    const matchedPrompts = matches
      .map(match => {
        const prompt = allPrompts.find(p => p.id === match.id)
        if (!prompt) return null

        const tags = prompt.prompt_tags?.map((pt: PromptTag) => ({
          id: pt.tags.id,
          name: pt.tags.name
        })) || []

        return {
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          content: prompt.content,
          created_at: prompt.created_at,
          updated_at: prompt.updated_at,
          user_id: prompt.user_id,
          is_private: prompt.is_private || false,
          tags: tags,
          use_count: prompt.use_count || 0,
          is_favorite: prompt.is_favorite || false,
          match_score: match.score,
          matching_details: {
            score: match.score,
            domain_match: match.detail_scores ? match.detail_scores.domain >= 15 : false,
            detail_scores: match.detail_scores || {
              domain: 0,
              function: 0,
              scenario: 0,
              quality: 0
            }
          }
        }
      })
      .filter((prompt): prompt is MatchedPrompt => prompt !== null)
      .sort((a, b) => b.match_score - a.match_score)

    console.log('Final matched prompts:', matchedPrompts.length)

    // 返回结果
    return res.status(200).json({
      success: true,
      data: {
        analysis: searchCriteria,
        results: matchedPrompts,
        message: matchedPrompts.length > 0 
          ? `找到 ${matchedPrompts.length} 个相关提示词，已按相关度排序` 
          : '未找到完全匹配的提示词，建议调整搜索条件或使用更具体的描述。'
      }
    })

  } catch (error) {
    console.error('Smart search error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    })
  }
} 