# 提示词管理器

一个专业的AI提示词管理工具，帮助您更好地组织和管理AI提示词。

## 功能特点

- 提示词创建与编辑
  - 快速创建和编辑提示词
  - 支持标题、内容、描述、语言、用途等信息
  - 支持Markdown格式

- 提示词分类与组织
  - 标签管理系统
  - 灵活的分类方式
  - 层级化组织

- 搜索与过滤
  - 关键词搜索
  - 标签过滤
  - 多维度排序

- 用户权限管理
  - 个人/团队隐私控制
  - 权限级别设置

## 技术栈

- 前端：Next.js + React + TypeScript
- UI：TailwindCSS + HeadlessUI
- 后端：Supabase
- 状态管理：Zustand

## 开始使用

1. 克隆项目
```bash
git clone https://github.com/yourusername/prompt-manager.git
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

### tags 表
- id: uuid (主键)
- name: string (标签名)
- user_id: uuid (用户ID)
- created_at: timestamp

### prompt_tags 表
- prompt_id: uuid (外键)
- tag_id: uuid (外键)

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情 