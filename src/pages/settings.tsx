import { useState } from 'react';
import Layout from '@/components/Layout';
import { ChangeEvent } from 'react';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import message from 'antd/lib/message';
import Card from 'antd/lib/card';
import Divider from 'antd/lib/divider';
import { FiExternalLink } from 'react-icons/fi';

interface KeyState {
  value: string;
  loading: boolean;
}

type KeyName = 'deepseek' | 'supabaseUrl' | 'supabaseAnonKey' | 'supabaseServiceKey';

interface KeysState {
  deepseek: KeyState;
  supabaseUrl: KeyState;
  supabaseAnonKey: KeyState;
  supabaseServiceKey: KeyState;
}

export default function Settings() {
  const [keys, setKeys] = useState<KeysState>({
    deepseek: { value: '', loading: false },
    supabaseUrl: { value: '', loading: false },
    supabaseAnonKey: { value: '', loading: false },
    supabaseServiceKey: { value: '', loading: false },
  });

  const handleUpdateKey = async (keyName: KeyName, envKey: string) => {
    setKeys(prev => ({
      ...prev,
      [keyName]: { ...prev[keyName], loading: true }
    }));

    try {
      const response = await fetch('/api/settings/update-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: envKey,
          value: keys[keyName].value,
        }),
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      message.success('密钥更新成功');
      setKeys(prev => ({
        ...prev,
        [keyName]: { value: '', loading: false }
      }));
    } catch (error: any) {
      message.error('更新失败：' + error.message);
    } finally {
      setKeys(prev => ({
        ...prev,
        [keyName]: { ...prev[keyName], loading: false }
      }));
    }
  };

  const renderKeyInput = (
    title: string,
    keyName: KeyName,
    envKey: string,
    description?: string
  ) => (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="space-y-4">
        <div>
          <Input.Password
            value={keys[keyName].value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => 
              setKeys(prev => ({
                ...prev,
                [keyName]: { ...prev[keyName], value: e.target.value }
              }))
            }
            placeholder={`请输入新的${title}`}
            className="w-full"
          />
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        <Button
          type="primary"
          onClick={() => handleUpdateKey(keyName, envKey)}
          loading={keys[keyName].loading}
          disabled={!keys[keyName].value}
        >
          更新密钥
        </Button>
      </div>
    </div>
  );

  const renderGuide = () => (
    <Card className="mt-8">
      <h2 className="text-xl font-semibold mb-4">🎓 配置指南</h2>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium mb-3">🤖 DeepSeek API 配置</h3>
          <div className="pl-4 space-y-2 text-gray-600">
            <p>1. 访问 DeepSeek 官网 <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 inline-flex items-center">platform.deepseek.com <FiExternalLink className="ml-1" /></a></p>
            <p>2. 注册或登录您的账号</p>
            <p>3. 点击右上角的"个人中心"</p>
            <p>4. 在左侧菜单找到"API Keys"</p>
            <p>5. 点击"创建新的 API Key"</p>
            <p>6. 复制生成的密钥（注意：密钥只显示一次！）</p>
            <p>7. 将密钥粘贴到上方的 DeepSeek API 密钥输入框中</p>
          </div>
        </div>

        <Divider />

        <div>
          <h3 className="text-lg font-medium mb-3">📦 Supabase 配置</h3>
          <div className="pl-4 space-y-2 text-gray-600">
            <p>1. 访问 Supabase 官网 <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 inline-flex items-center">supabase.com <FiExternalLink className="ml-1" /></a></p>
            <p>2. 注册或登录您的账号</p>
            <p>3. 创建新项目或选择现有项目</p>
            <p>4. 在项目设置中找到"API"部分</p>
            <p>5. 您会看到以下信息：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Project URL - 复制到 Supabase URL</li>
              <li>anon public - 复制到 Supabase Anon Key</li>
              <li>service_role secret - 复制到 Supabase Service Key</li>
            </ul>
            <p className="mt-2 text-amber-600">⚠️ 注意：请妥善保管您的密钥，特别是 service_role key，它具有完整的数据库访问权限！</p>
          </div>
        </div>

        <Divider />

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2 text-blue-700">💡 温馨提示</h3>
          <ul className="pl-4 space-y-2 text-blue-600">
            <li>• 更新密钥后需要重启应用才能生效</li>
            <li>• 请确保输入的密钥格式正确</li>
            <li>• 建议在更新密钥前先测试其有效性</li>
            <li>• 如果遇到问题，请检查密钥是否正确复制，确保没有多余的空格</li>
          </ul>
        </div>
      </div>
    </Card>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">系统设置</h1>
        
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">API 密钥设置</h2>
          
          {renderKeyInput(
            'DeepSeek API 密钥',
            'deepseek',
            'DEEPSEEK_API_KEY',
            '更新后需要重启应用才能生效'
          )}
        </Card>
        
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Supabase 设置</h2>
          
          {renderKeyInput(
            'Supabase URL',
            'supabaseUrl',
            'NEXT_PUBLIC_SUPABASE_URL'
          )}
          
          <Divider />
          
          {renderKeyInput(
            'Supabase Anon Key',
            'supabaseAnonKey',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY'
          )}
          
          <Divider />
          
          {renderKeyInput(
            'Supabase Service Key',
            'supabaseServiceKey',
            'SUPABASE_SERVICE_ROLE_KEY'
          )}
        </Card>

        {renderGuide()}
      </div>
    </Layout>
  );
} 