import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { FiUpload, FiDownload } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface ImportPromptsModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (prompts: any[]) => Promise<void>
}

export default function ImportPromptsModal({ isOpen, onClose, onImport }: ImportPromptsModalProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      let prompts: any[] = []

      if (fileExtension === 'json') {
        // 处理 JSON 文件
        const text = await file.text()
        prompts = JSON.parse(text)
      } else if (['xlsx', 'csv'].includes(fileExtension || '')) {
        // 处理 Excel/CSV 文件
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const worksheet = workbook.Sheets[workbook.SheetNames[1]] // 使用第二个sheet（导入模版）
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        prompts = jsonData
      } else {
        throw new Error('不支持的文件格式')
      }

      // 验证数据
      const validPrompts = prompts.filter(prompt => {
        const isValid = prompt.title && prompt.content
        if (!isValid) {
          console.warn('Invalid prompt:', prompt)
        }
        return isValid
      })

      if (validPrompts.length === 0) {
        throw new Error('没有找到有效的提示词数据')
      }

      await onImport(validPrompts)
      toast.success(`成功导入 ${validPrompts.length} 个提示词`)
      onClose()
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.message || '导入失败')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const templateUrl = '/templates/prompt_template.xlsx'
    const link = document.createElement('a')
    link.href = templateUrl
    link.download = 'prompt_template.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            批量导入提示词
          </Dialog.Title>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              请选择要导入的文件，支持 .xlsx、.csv 和 .json 格式。
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                下载导入模版
              </button>

              <label className="relative">
                <input
                  type="file"
                  accept=".xlsx,.csv,.json"
                  onChange={handleFileSelect}
                  className="sr-only"
                  disabled={isUploading}
                />
                <div className="inline-flex w-full items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer">
                  <FiUpload className="mr-2 h-4 w-4" />
                  {isUploading ? '导入中...' : '选择文件并导入'}
                </div>
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                取消
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 