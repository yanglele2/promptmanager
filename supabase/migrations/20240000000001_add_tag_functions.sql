-- 创建查找孤立标签的函数
CREATE OR REPLACE FUNCTION find_orphan_tags()
RETURNS TABLE (
  id uuid,
  name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name
  FROM tags t
  LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
  WHERE pt.tag_id IS NULL;
END;
$$;

-- 创建删除孤立标签的函数
CREATE OR REPLACE FUNCTION delete_orphan_tags(tag_ids uuid[])
RETURNS SETOF tags
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 删除标签关联
  DELETE FROM prompt_tags
  WHERE tag_id = ANY(tag_ids);
  
  -- 删除标签并返回删除的记录
  RETURN QUERY
  DELETE FROM tags
  WHERE id = ANY(tag_ids)
  RETURNING *;
END;
$$;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION find_orphan_tags() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_orphan_tags(uuid[]) TO authenticated; 