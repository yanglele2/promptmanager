import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Folder } from '@/types/';
import Link from 'next/link';
import { PlusIcon, FolderIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      console.log('开始获取文件夹列表...');
      
      // 获取文件夹列表
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, description, user_id, parent_id, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取文件夹失败:', error);
        toast.error(`获取文件夹失败: ${error.message}`);
        return;
      }

      if (!data) {
        console.log('没有获取到文件夹数据');
        setFolders([]);
        return;
      }

      // 转换数据格式
      const formattedFolders: Folder[] = data.map(folder => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        user_id: folder.user_id || '',
        parent_id: folder.parent_id,
        created_at: folder.created_at,
        updated_at: folder.updated_at
      }));

      console.log(`成功获取到 ${formattedFolders.length} 个文件夹:`, formattedFolders);
      setFolders(formattedFolders);
    } catch (err) {
      console.error('获取文件夹时发生异常:', err);
      toast.error('获取文件夹时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('folders').insert({
        name: newFolderName.trim(),
        description: null,
        parent_id: null
      });

      if (error) {
        toast.error('创建文件夹失败');
        console.error('Error creating folder:', error);
        return;
      }

      toast.success('创建成功');
      setNewFolderName('');
      fetchFolders();
    } finally {
      setIsLoading(false);
    }
  };

  const updateFolder = async (id: string, name: string) => {
    if (!name.trim()) {
      toast.error('文件夹名称不能为空');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: name.trim() })
        .eq('id', id);

      if (error) {
        toast.error('更新文件夹失败');
        console.error('Error updating folder:', error);
        return;
      }

      toast.success('更新成功');
      setEditingFolder(null);
      fetchFolders();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('确定要删除这个文件夹吗？')) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('删除文件夹失败');
        console.error('Error deleting folder:', error);
        return;
      }

      toast.success('删除成功');
      fetchFolders();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">文件夹管理</h1>
      
      {/* 创建新文件夹 */}
      <div className="mb-8 flex gap-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="输入文件夹名称"
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={createFolder}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="w-5 h-5" />
          {isLoading ? '创建中...' : '创建文件夹'}
        </button>
      </div>

      {/* 文件夹列表 */}
      {isLoading && folders.length === 0 ? (
        <div className="text-center text-gray-500">加载中...</div>
      ) : folders.length === 0 ? (
        <div className="text-center text-gray-500">暂无文件夹</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              {editingFolder?.id === folder.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingFolder.name}
                    onChange={(e) =>
                      setEditingFolder({ ...editingFolder, name: e.target.value })
                    }
                    className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => updateFolder(folder.id, editingFolder.name)}
                    disabled={isLoading}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingFolder(null)}
                    disabled={isLoading}
                    className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <Link
                    href={`/folders/${folder.id}`}
                    className="flex items-center gap-2 flex-1 hover:text-blue-500"
                  >
                    <FolderIcon className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{folder.name}</span>
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingFolder(folder)}
                      disabled={isLoading}
                      className="p-1 text-gray-500 hover:text-blue-500 disabled:opacity-50"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      disabled={isLoading}
                      className="p-1 text-gray-500 hover:text-red-500 disabled:opacity-50"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 