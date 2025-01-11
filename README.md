# 提示词管理器 (v1.11)

一个专业的AI提示词管理工具，帮助您更好地组织和管理AI提示词。支持多种AI模型，提供智能提示词生成功能。

## 功能特点

- 提示词创建与编辑
  - 快速创建和编辑提示词
  - 支持标题、内容、描述、语言、用途等信息
  - 支持Markdown格式
  - AI辅助提示词生成

- 提示词分类与组织
  - 标签管理系统
  - 灵活的分类方式
  - 层级化组织
  - 智能标签推荐

- 搜索与过滤
  - 关键词搜索
  - 标签过滤
  - 多维度排序
  - 高级搜索选项

- 用户权限管理
  - 个人/团队隐私控制
  - 权限级别设置
  - 多用户协作

- AI模型支持
  - 支持多种AI模型（DeepSeek、OpenRouter等）
  - 模型性能优化
  - 自定义模型配置

## 技术栈

- 前端：Next.js + React + TypeScript
- UI：TailwindCSS + HeadlessUI
- 后端：Supabase
- 状态管理：Zustand
- AI集成：DeepSeek、OpenRouter API

## 开始使用

1. 克隆项目
```bash
git clone https://github.com/yanglele2/prompt-manager.git
cd prompt-manager
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env.local` 文件并添加以下内容：
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. 运行开发服务器
```bash
npm run dev
```

5. 访问 [http://localhost:3000](http://localhost:3000)

## 数据库结构

### prompts 表
- id: uuid (主键)
- title: string (标题)
- content: text (内容)
- description: text (描述)
- language: string (语言)
- purpose: string (用途)
- user_id: uuid (用户ID)
- created_at: timestamp
- updated_at: timestamp
- is_private: boolean
- usage_count: integer
- type: string (提示词类型)
- source: string (来源)
- category: string (分类)

### tags 表
- id: uuid (主键)
- name: string (标签名)
- user_id: uuid (用户ID)
- created_at: timestamp

### prompt_tags 表
- prompt_id: uuid (外键)
- tag_id: uuid (外键)

### chat_messages 表
- id: uuid (主键)
- prompt_id: uuid (外键)
- role: string (角色)
- content: text (内容)
- created_at: timestamp
- model: string (使用的模型)

## 版本历史

### v1.11 (2024-01-11)
- 新增AI模型支持（DeepSeek、OpenRouter）
- 优化提示词生成功能
- 改进用户界面和交互体验
- 新增聊天历史记录功能
- 数据库结构优化

### v1.9 (2024-01-09)
- 新增设置页面
- 优化提示词生成
- API密钥管理功能
- 性能优化

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情 