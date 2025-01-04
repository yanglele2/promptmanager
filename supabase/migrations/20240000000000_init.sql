-- 修改 chats 表结构
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey;
ALTER TABLE chats ALTER COLUMN user_id DROP NOT NULL;

-- 修改 chats 表的 RLS 策略
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允许所有操作" ON chats;
CREATE POLICY "允许所有操作" ON chats FOR ALL USING (true);

-- 修改 chat_messages 表的 RLS 策略
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "允许所有操作" ON chat_messages;
CREATE POLICY "允许所有操作" ON chat_messages FOR ALL USING (true); 