-- 禁用 RLS
ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tags DISABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "允许所有用户查看公开提示词" ON prompts;
DROP POLICY IF EXISTS "允许所有用户查看标签" ON tags;
DROP POLICY IF EXISTS "允许所有用户查看标签关联" ON prompt_tags;
DROP POLICY IF EXISTS "允许所有用户创建标签" ON tags;
DROP POLICY IF EXISTS "允许所有用户创建标签关联" ON prompt_tags;
DROP POLICY IF EXISTS "允许所有用户更新标签" ON tags;
DROP POLICY IF EXISTS "允许所有用户删除标签" ON tags;
DROP POLICY IF EXISTS "允许所有用户删除标签关联" ON prompt_tags;

-- 授予公共访问权限
GRANT ALL ON prompts TO anon, authenticated;
GRANT ALL ON tags TO anon, authenticated;
GRANT ALL ON prompt_tags TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated; 