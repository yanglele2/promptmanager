-- 创建搜索历史表
CREATE TABLE IF NOT EXISTS search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    results JSONB NOT NULL, -- 存储搜索结果
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 添加索引
CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history(created_at);

-- 添加 RLS 策略
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户只能查看自己的搜索历史" 
    ON search_history 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 授予访问权限
GRANT ALL ON search_history TO authenticated; 