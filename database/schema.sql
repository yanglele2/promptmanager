-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建提示词表
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  language TEXT,
  purpose TEXT,
  tags TEXT[] DEFAULT '{}',  -- 使用数组存储标签
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false
);

-- 创建文件夹表
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建提示词和文件夹的关联表
CREATE TABLE IF NOT EXISTS public.prompt_folders (
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (prompt_id, folder_id)
);

-- 启用 RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_folders ENABLE ROW LEVEL SECURITY;

-- 删除现有策略
DROP POLICY IF EXISTS "Allow all operations on prompts" ON public.prompts;
DROP POLICY IF EXISTS "Allow all operations on folders" ON public.folders;
DROP POLICY IF EXISTS "Allow all operations on prompt_folders" ON public.prompt_folders;

-- prompts 表的权限策略
CREATE POLICY "Allow all operations on prompts"
  ON public.prompts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- folders 表的权限策略
CREATE POLICY "Allow all operations on folders"
  ON public.folders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- prompt_folders 表的权限策略
CREATE POLICY "Allow all operations on prompt_folders"
  ON public.prompt_folders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 确保所有相关表的 user_id 是可选的
ALTER TABLE public.folders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.prompts ALTER COLUMN user_id DROP NOT NULL;

-- 添加性能优化的索引
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS prompt_folders_prompt_id_idx ON public.prompt_folders(prompt_id);
CREATE INDEX IF NOT EXISTS prompt_folders_folder_id_idx ON public.prompt_folders(folder_id);
CREATE INDEX IF NOT EXISTS prompts_tags_idx ON prompts USING gin(tags);
-- 创建tags表
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建prompt_tags关联表
CREATE TABLE IF NOT EXISTS public.prompt_tags (
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (prompt_id, tag_id)
);

-- 添加RLS策略
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_tags ENABLE ROW LEVEL SECURITY;

-- 为tags表创建策略
CREATE POLICY "允许所有用户查看标签" ON public.tags
    FOR SELECT USING (true);

CREATE POLICY "允许认证用户创建标签" ON public.tags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 为prompt_tags表创建策略
CREATE POLICY "允许所有用户查看提示词标签" ON public.prompt_tags
    FOR SELECT USING (true);

CREATE POLICY "允许认证用户管理提示词标签" ON public.prompt_tags
    FOR ALL USING (auth.role() = 'authenticated');

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt_id ON public.prompt_tags(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id ON public.prompt_tags(tag_id);

-- 创建chats表
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 创建chat_messages表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 添加RLS策略
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 删除现有的 RLS 策略
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their chats" ON chat_messages;

-- 创建新的 RLS 策略，允许所有操作
CREATE POLICY "Enable all access for chats" ON chats
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for chat_messages" ON chat_messages
  FOR ALL USING (true)
  WITH CHECK (true);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
