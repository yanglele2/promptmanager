-- 添加提示词统计相关字段
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 创建提示词使用记录表
CREATE TABLE IF NOT EXISTS prompt_usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    context TEXT -- 记录在什么场景下使用的提示词
);

-- 添加 RLS 策略
ALTER TABLE prompt_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有操作" ON prompt_usage_logs FOR ALL USING (true);

-- 创建更新使用次数的触发器函数
CREATE OR REPLACE FUNCTION increment_prompt_use_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE prompts
    SET use_count = use_count + 1
    WHERE id = NEW.prompt_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS increment_use_count_trigger ON prompt_usage_logs;
CREATE TRIGGER increment_use_count_trigger
    AFTER INSERT ON prompt_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION increment_prompt_use_count(); 