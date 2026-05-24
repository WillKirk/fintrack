'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import ConfirmModal from '@/components/ConfirmModal'
import CSVImport from '@/components/CSVImport'

type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  colour: string
}

type Transaction = {
  id: number
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  category_id: number
  category: string
  colour: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  })
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/transactions').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([txs, cats]) => {
      setTransactions(txs)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  const filteredCategories = categories.filter((c) => c.type === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        amount: parseFloat(amount),
        category_id: parseInt(categoryId),
        description,
        date,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    // Refresh transactions
    const updated = await fetch('/api/transactions').then((r) => r.json())
    setTransactions(updated)
    setShowForm(false)
    setAmount('')
    setDescription('')
    setCategoryId('')
    setSubmitting(false)
  }

  async function handleDelete(id: number) {
    setConfirmModal({ isOpen: true, id })
  }
  
  async function confirmDelete() {
    if (!confirmModal.id) return
    await fetch(`/api/transactions?id=${confirmModal.id}`, { method: 'DELETE' })
    setTransactions((prev) => prev.filter((t) => t.id !== confirmModal.id))
    setConfirmModal({ isOpen: false, id: null })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1">All your income and expenses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors duration-200"
        >
          <Plus size={15} />
          Add transaction
        </button>
        <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
            <Upload size={15} />
            Import CSV
        </button>
      </div>

      {/* Add transaction form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-800 mb-4">New transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Type toggle */}
            <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
              <button
                type="button"
                onClick={() => { setType('expense'); setCategoryId('') }}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                  type === 'expense'
                    ? 'bg-danger text-white'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => { setType('income'); setCategoryId('') }}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                  type === 'income'
                    ? 'bg-success text-white'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Income
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary transition-colors"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary transition-colors"
                required
              >
                <option value="">Select a category</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary transition-colors"
                placeholder="e.g. Tesco, Monthly salary..."
              />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors duration-200',
                  submitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {submitting ? 'Saving...' : 'Save transaction'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions list */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-400 text-sm">No transactions yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-indigo-primary hover:text-indigo-hover active:opacity-70 transition-opacity"
            >
              Add your first transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors duration-150 group">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: tx.colour + '20' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tx.colour }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {tx.description || tx.category}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.category} · {formatDate(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={cn(
                    'text-sm font-medium',
                    tx.type === 'income' ? 'text-success' : 'text-danger'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-danger transition-all duration-150"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <ConfirmModal
            isOpen={confirmModal.isOpen}
            title="Delete transaction"
            message="Are you sure you want to delete this transaction? This can't be undone."
            onConfirm={confirmDelete}
            onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        />
        {showImport && (
            <CSVImport
                categories={categories}
                onImportComplete={async () => {
                const updated = await fetch('/api/transactions').then((r) => r.json())
                setTransactions(updated)
                }}
                onClose={() => setShowImport(false)}
            />
        )}
      </div>

    </div>
  )
}