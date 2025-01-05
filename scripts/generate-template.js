const XLSX = require('xlsx');

// 创建工作簿
const workbook = XLSX.utils.book_new();

// 创建数据
const data = [
  ['字段', '是否必填', '说明', '示例'],
  ['title', '是', '提示词的标题', '面向学习者和旅行者的简洁语言翻译工具'],
  ['content', '是', '提示词的具体内容', '充当语言翻译员。你将收到[待翻译文本]...'],
  ['description', '否', '提示词的简要描述', '一个帮助学习和旅行的翻译助手'],
  ['tags', '否', '标签，多个标签用逗号分隔', 'AI,翻译工具,学习工具'],
];

// 创建示例数据
const exampleData = [
  ['title', 'content', 'description', 'tags'],
  [
    '面向学习者和旅行者的简洁语言翻译工具',
    '充当语言翻译员。你将收到[待翻译文本]，你的目标是准确地将文本翻译成目标语言。',
    '一个帮助学习和旅行的翻译助手',
    'AI,翻译工具,学习工具'
  ],
  [
    '专业文档校对助手',
    '请帮我校对以下文档，注意检查错别字、语法错误和表达不准确的地方。',
    '提供专业的文档校对服务',
    '文档校对,写作辅助'
  ]
];

// 创建说明工作表
const descSheet = XLSX.utils.aoa_to_sheet(data);

// 设置列宽
const colWidths = [{ wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 40 }];
descSheet['!cols'] = colWidths;

// 创建模版工作表
const templateSheet = XLSX.utils.aoa_to_sheet(exampleData);

// 设置模版工作表的列宽
const templateColWidths = [{ wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 20 }];
templateSheet['!cols'] = templateColWidths;

// 将工作表添加到工作簿
XLSX.utils.book_append_sheet(workbook, descSheet, '填写说明');
XLSX.utils.book_append_sheet(workbook, templateSheet, '导入模版');

// 保存文件
XLSX.writeFile(workbook, 'public/templates/prompt_template.xlsx'); 