-- 先删除现有的外键约束
ALTER TABLE chats
DROP CONSTRAINT IF EXISTS chats_user_id_fkey;

-- 修改 user_id 列定义
ALTER TABLE chats
ALTER COLUMN user_id DROP NOT NULL;

-- 重新添加外键约束，允许 NULL
ALTER TABLE chats
ADD CONSTRAINT chats_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE; 