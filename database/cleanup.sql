-- 添加 tags 列到 prompts 表（如果不存在）
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE prompts ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 只有当旧表存在时才执行数据迁移
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'tags' 
        AND table_schema = 'public'
    ) THEN
        -- 备份现有的标签数据
        CREATE TEMP TABLE temp_prompt_tags AS
        SELECT DISTINCT pt.prompt_id, t.name as tag_name
        FROM prompt_tags pt
        JOIN tags t ON pt.tag_id = t.id;

        -- 更新 prompts 表中的 tags 数组
        UPDATE prompts p
        SET tags = ARRAY(
            SELECT tag_name
            FROM temp_prompt_tags
            WHERE prompt_id = p.id
            ORDER BY tag_name
        );

        -- 删除临时表
        DROP TABLE temp_prompt_tags;

        -- 删除旧的表和相关对象
        DROP TABLE IF EXISTS prompt_tags CASCADE;
        DROP TABLE IF EXISTS tags CASCADE;
    END IF;
END $$;

-- 创建标签索引
CREATE INDEX IF NOT EXISTS prompts_tags_idx ON prompts USING gin(tags); 