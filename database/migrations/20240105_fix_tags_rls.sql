-- 删除现有的tags表策略
DROP POLICY IF EXISTS "允许所有用户查看标签" ON public.tags;
DROP POLICY IF EXISTS "允许认证用户创建标签" ON public.tags;

-- 创建新的策略，允许认证用户执行所有操作
CREATE POLICY "Enable all operations for authenticated users" ON public.tags
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 创建策略允许所有用户查看标签
CREATE POLICY "Enable viewing for all users" ON public.tags
    FOR SELECT
    USING (true); 