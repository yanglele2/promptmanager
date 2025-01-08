import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    // 匹配所有需要的密钥
    const deepseekMatch = envContent.match(/DEEPSEEK_API_KEY=(.+)/);
    const difyMatch = envContent.match(/DIFY_API_KEY=(.+)/);
    const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const supabaseAnonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    const supabaseServiceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

    return res.status(200).json({
      deepseekKey: deepseekMatch ? deepseekMatch[1] : '',
      difyKey: difyMatch ? difyMatch[1] : '',
      supabaseUrl: supabaseUrlMatch ? supabaseUrlMatch[1] : '',
      supabaseAnonKey: supabaseAnonKeyMatch ? supabaseAnonKeyMatch[1] : '',
      supabaseServiceKey: supabaseServiceKeyMatch ? supabaseServiceKeyMatch[1] : '',
    });
  } catch (error) {
    console.error('获取环境变量失败:', error);
    return res.status(500).json({ message: '服务器错误' });
  }
} 