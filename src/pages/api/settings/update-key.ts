import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const ALLOWED_KEYS = [
  'DEEPSEEK_API_KEY',
  'DIFY_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const { key, value } = req.body;

    if (!key || !value) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    // 只允许更新特定的环境变量
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ message: '不允许更新该环境变量' });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // 使用正则表达式匹配并替换环境变量
    const regex = new RegExp(`${key}=.*`, 'g');
    const newContent = envContent.replace(regex, `${key}=${value}`);

    // 写入新的环境变量
    fs.writeFileSync(envPath, newContent, 'utf-8');

    return res.status(200).json({ message: '更新成功' });
  } catch (error) {
    console.error('更新环境变量失败:', error);
    return res.status(500).json({ message: '服务器错误' });
  }
} 