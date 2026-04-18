'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UploadCloud, FileType, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { apiFetch } from '@/lib/api-client'

interface BulkImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: number
  onSuccess: () => void
}

const EXPECTED_COLUMNS = [
  'sample_sentence',
  'translation',
  'pronunciation',
  'structure',
  'type',
  'function',
  'example1',
  'example1_translation',
  'example1_pronunciation',
  'example2',
  'example2_translation',
  'example2_pronunciation'
]

export function BulkImportModal({ open, onOpenChange, topicId, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    parseFile(selected)
  }

  const parseFile = (file: File) => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data)
        },
        error: (error) => {
          toast.error(`Lỗi đọc CSV: ${error.message}`)
        }
      })
    } else if (name.endsWith('.xlsx')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const json = XLSX.utils.sheet_to_json(worksheet)
          setData(json)
        } catch (err) {
          toast.error('Lỗi đọc file Excel')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Chỉ hỗ trợ file .csv và .xlsx')
    }
  }

  const handleImport = async () => {
    if (data.length === 0) {
      toast.error('Không có dữ liệu hợp lệ để import')
      return
    }

    setLoading(true)
    try {
      const result = await apiFetch<{ count: number }>('/api/phrases/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, data }),
      })
      toast.success(`Nhập thành công ${result.count} câu!`)
      onSuccess()
      onOpenChange(false)
      setFile(null)
      setData([])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setData([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nhập từ file Excel/CSV</DialogTitle>
          <DialogDescription>
            Đảm bảo file của bạn có dòng tiêu đề (cột thứ nhất). Cột bắt buộc: <code className="bg-gray-100 px-1 rounded text-orange-600">sample_sentence</code>.
            Các cột khác (tùy chọn): <code className="bg-gray-100 px-1 rounded">translation, pronunciation, structure, type, example1, ...</code>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!file ? (
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-10 w-10 text-gray-400 mb-4" />
              <p className="text-sm font-medium text-gray-700">Nhấn để tải file Excel hoặc CSV lên</p>
              <p className="text-xs text-gray-500 mt-1">Hỗ trợ .csv, .xlsx</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <FileType className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">{data.length} dòng dữ liệu hợp lệ</p>
                  </div>
                </div>
                <button onClick={handleReset} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {data.length > 0 ? (
                <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 w-10">#</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500">Mẫu câu (sample_sentence)</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500">Dịch nghĩa (translation)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-2 text-gray-900">
                            {row.sample_sentence ? (
                              row.sample_sentence
                            ) : (
                              <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Thiếu</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">{row.translation || '-'}</td>
                        </tr>
                      ))}
                      {data.length > 10 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-center text-xs text-gray-400 bg-gray-50">
                            ... và {data.length - 10} dòng khác
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg text-sm border border-gray-100">
                  Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng đảm bảo file có dòng tiêu đề đúng chuẩn.
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                <Button 
                  onClick={handleImport} 
                  disabled={loading || data.length === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? 'Đang xử lý...' : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Thêm {data.length} câu
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
