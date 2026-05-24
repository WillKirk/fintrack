'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  colour: string
}

type ParsedRow = {
  date: string
  amount: number
  description: string
  type: 'income' | 'expense'
  valid: boolean
  error?: string
}

type ColumnMapping = {
  date: string
  amount: string
  description: string
  type: string
}

type Step = 'upload' | 'mapping' | 'preview' | 'done'

function parseDate(str: string): string | null {
  // Try common UK date formats
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = str.match(format)
    if (match) {
      if (format === formats[0] || format === formats[2]) {
        return `${match[3]}-${match[2]}-${match[1]}`
      }
      return str
    }
  }
  return null
}

function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[£,$,€,\s]/g, '').replace(/,/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.abs(num)
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
  const rows = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.trim().replace(/"/g, ''))
  )
  return { headers, rows }
}

type Props = {
  categories: Category[]
  onImportComplete: () => void
  onClose: () => void
}

export default function CSVImport({ categories, onImportComplete, onClose }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    description: '',
    type: '',
  })
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense')
  const [defaultCategoryId, setDefaultCategoryId] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [categoryAssignments, setCategoryAssignments] = useState<Record<number, number>>({})

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const { headers, rows } = parseCSV(text)
      setHeaders(headers)
      setRows(rows)

      // Auto-detect common column names
      const autoMapping: ColumnMapping = {
        date: headers.find((h) => /date/i.test(h)) ?? '',
        amount: headers.find((h) => /amount|value|sum/i.test(h)) ?? '',
        description: headers.find((h) => /desc|memo|name|narrative/i.test(h)) ?? '',
        type: headers.find((h) => /type|category|direction/i.test(h)) ?? '',
      }
      setMapping(autoMapping)
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [])

  function handlePreview() {
    if (!mapping.date || !mapping.amount) return

    const dateIdx = headers.indexOf(mapping.date)
    const amountIdx = headers.indexOf(mapping.amount)
    const descIdx = mapping.description ? headers.indexOf(mapping.description) : -1
    const typeIdx = mapping.type ? headers.indexOf(mapping.type) : -1

    const parsed = rows.filter((row) => row.length > 1).map((row) => {
      const dateStr = row[dateIdx] ?? ''
      const amountStr = row[amountIdx] ?? ''
      const description = descIdx >= 0 ? row[descIdx] ?? '' : ''
      const typeStr = typeIdx >= 0 ? row[typeIdx] ?? '' : ''

      const date = parseDate(dateStr)
      const amount = parseAmount(amountStr)

      let type: 'income' | 'expense' = defaultType
      if (typeStr) {
        if (/credit|income|in/i.test(typeStr)) type = 'income'
        else if (/debit|expense|out/i.test(typeStr)) type = 'expense'
      }

      // Check if original amount was negative — likely expense
      const rawAmount = parseFloat(amountStr.replace(/[£,$,€,\s]/g, ''))
      if (!isNaN(rawAmount) && rawAmount < 0) type = 'expense'
      if (!isNaN(rawAmount) && rawAmount > 0 && !typeStr) type = defaultType

      if (!date) {
        return { date: dateStr, amount: 0, description, type, valid: false, error: 'Invalid date' }
      }
      if (!amount) {
        return { date, amount: 0, description, type, valid: false, error: 'Invalid amount' }
      }

      return { date, amount, description, type, valid: true }
    })

    setParsedRows(parsed)
    const initialAssignments: Record<number, number> = {}
    parsed.forEach((_, i) => {
      if (defaultCategoryId) initialAssignments[i] = parseInt(defaultCategoryId)
    })
    setCategoryAssignments(initialAssignments)
    setStep('preview')
  }

  async function handleImport() {
    setImporting(true)

    const validTransactions = parsedRows
      .map((row, i) => ({ ...row, categoryId: categoryAssignments[i] }))
      .filter((row) => row.valid && row.categoryId)
      .map((row) => ({
        type: row.type,
        amount: row.amount,
        category_id: row.categoryId,
        description: row.description,
        date: row.date,
      }))

    const res = await fetch('/api/transactions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: validTransactions }),
    })

    const data = await res.json()
    setImportedCount(data.imported)
    setStep('done')
    setImporting(false)
  }

  const validCount = parsedRows.filter((r) => r.valid).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-800">Import from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {(['upload', 'mapping', 'preview', 'done'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  step === s ? 'bg-indigo-primary text-white' :
                  ['upload', 'mapping', 'preview', 'done'].indexOf(step) > i
                    ? 'bg-success text-white'
                    : 'bg-gray-100 text-gray-400'
                )}>
                  {['upload', 'mapping', 'preview', 'done'].indexOf(step) > i
                    ? <Check size={12} />
                    : i + 1}
                </div>
                <span className="text-xs text-gray-400 capitalize">{s}</span>
                {i < 3 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            ))}
          </div>

          {/* Upload step */}
          {step === 'upload' && (
            <div>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-primary transition-colors duration-150">
                <Upload size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Click to upload a CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Exported from your bank</p>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}

          {/* Mapping step */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Found {rows.length} rows. Match your CSV columns to the fields below.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date column <span className="text-danger">*</span></label>
                  <select
                    value={mapping.date}
                    onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-primary transition-colors"
                  >
                    <option value="">Select column</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount column <span className="text-danger">*</span></label>
                  <select
                    value={mapping.amount}
                    onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-primary transition-colors"
                  >
                    <option value="">Select column</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description column</label>
                  <select
                    value={mapping.description}
                    onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-primary transition-colors"
                  >
                    <option value="">None</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type column</label>
                  <select
                    value={mapping.type}
                    onChange={(e) => setMapping({ ...mapping, type: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-primary transition-colors"
                  >
                    <option value="">None</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Default type</label>
                  <select
                    value={defaultType}
                    onChange={(e) => setDefaultType(e.target.value as 'income' | 'expense')}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-primary transition-colors"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Default category</label>
                  <select
                    value={defaultCategoryId}
                    onChange={(e) => setDefaultCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-primary transition-colors"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handlePreview}
                disabled={!mapping.date || !mapping.amount}
                className={cn(
                  'w-full bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors duration-200',
                  (!mapping.date || !mapping.amount) && 'opacity-50 cursor-not-allowed'
                )}
              >
                Preview transactions
              </button>
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {validCount} valid transactions found. Assign categories before importing.
                </p>
                <button
                  onClick={() => setStep('mapping')}
                  className="text-xs text-indigo-primary hover:text-indigo-hover"
                >
                  Back to mapping
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedRows.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-sm',
                      row.valid ? 'border-gray-200 bg-gray-50' : 'border-red-100 bg-red-50'
                    )}
                  >
                    {!row.valid && <AlertCircle size={14} className="text-danger shrink-0" />}
                    <span className="text-gray-400 text-xs w-20 shrink-0">{row.date}</span>
                    <span className={cn(
                      'text-xs font-medium w-16 shrink-0',
                      row.type === 'income' ? 'text-success' : 'text-danger'
                    )}>
                      {row.type === 'income' ? '+' : '-'}£{row.amount.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-600 flex-1 truncate">{row.description || '—'}</span>
                    {row.valid && (
                      <select
                        value={categoryAssignments[i] ?? ''}
                        onChange={(e) => setCategoryAssignments({ ...categoryAssignments, [i]: parseInt(e.target.value) })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-primary"
                      >
                        <option value="">Category</option>
                        {(row.type === 'expense' ? expenseCategories : incomeCategories).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    {!row.valid && <span className="text-xs text-danger">{row.error}</span>}
                  </div>
                ))}
              </div>

              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className={cn(
                  'w-full bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors duration-200',
                  (importing || validCount === 0) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {importing ? 'Importing...' : `Import ${validCount} transactions`}
              </button>
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={20} className="text-success" />
              </div>
              <p className="text-sm font-medium text-gray-800">
                {importedCount} transactions imported successfully
              </p>
              <button
                onClick={() => { onImportComplete(); onClose() }}
                className="bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors duration-200"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}