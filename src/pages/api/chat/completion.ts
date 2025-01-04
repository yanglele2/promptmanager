import { NextApiRequest, NextApiResponse } from 'next'
import { createChatCompletion } from '@/lib/deepseek'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' })
    }

    const response = await createChatCompletion(messages)
    res.status(200).json({ response })
  } catch (error) {
    console.error('Error in chat completion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 