import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { Folder, Prompt } from '@/types';
import Link from 'next/link';
import { FolderIcon, DocumentIcon } from '@heroicons/react/24/outline';

export default function FolderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [folder, setFolder] = useState<Folder | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    if (id) {
      fetchFolderDetails();
      fetchFolderPrompts();
    }
  }, [id]);

  const fetchFolderDetails = async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching folder:', error);
      return;
    }

    setFolder(data);
  };

  const fetchFolderPrompts = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select(`
        *,
        prompt_folders!inner(folder_id)
      `)
      .eq('prompt_folders.folder_id', id);

    if (error) {
      console.error('Error fetching prompts:', error);
      return;
    }

    setPrompts(data || []);
  };

  if (!folder) {
    return <div className="p-8">加载中...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/folders" className="text-blue-500 hover:underline">
          返回文件夹列表
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderIcon className="w-6 h-6 text-blue-500" />
          {folder.name}
        </h1>
      </div>

      {folder.description && (
        <p className="text-gray-600 mb-8">{folder.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prompts.map((prompt) => (
          <Link
            key={prompt.id}
            href={`/prompts/${prompt.id}`}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <DocumentIcon className="w-5 h-5 text-gray-500" />
              <h3 className="font-medium">{prompt.title}</h3>
            </div>
            {prompt.description && (
              <p className="text-gray-600 text-sm">{prompt.description}</p>
            )}
          </Link>
        ))}
      </div>

      {prompts.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          此文件夹中还没有提示词
        </div>
      )}
    </div>
  );
} 