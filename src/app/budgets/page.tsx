'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Budget = {
  id: number
  category_id: number
  category: string
  colour: string
  budget_amount: number
  spent: number
}

type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  colour: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

function AnimatedBar({ percentage, isOver }: { percentage: number; isOver: boolean }) {
    const [width, setWidth] = useState(0)
  
    useEffect(() => {
      const timer = setTimeout(() => setWidth(percentage), 50)
      return () => clearTimeout(timer)
    }, [percentage])
  
    return (
      <div className="w-full h-2 bg-gray-100 rounded-full mb-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-1000',
            isOver ? 'bg-danger' : percentage > 80 ? 'bg-yellow-400' : 'bg-success'
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    )
  }

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/budgets').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([budgets, cats]) => {
      setBudgets(budgets)
      setCategories(cats.filter((c: Category) => c.type === 'expense'))
      setLoading(false)
    })
  }, [])

  const availableCategories = categories.filter(
    (c) => !budgets.find((b) => b.category_id === c.id)
  )

  function handleCardClick(budget: Budget) {
    setEditingBudget(budget)
    setAmount(String(budget.budget_amount))
    setError('')
  }

  function handleAddNew() {
    setEditingBudget(null)
    setCategoryId('')
    setAmount('')
    setError('')
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingBudget(null)
    setCategoryId('')
    setAmount('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const payload = editingBudget
      ? { category_id: editingBudget.category_id, amount: parseFloat(amount) }
      : { category_id: parseInt(categoryId), amount: parseFloat(amount) }

    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    const updated = await fetch('/api/budgets').then((r) => r.json())
    setBudgets(updated)
    handleClose()
    setSubmitting(false)
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    if (!confirm('Delete this budget?')) return
    await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' })
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  const formVisible = showForm || editingBudget !== null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Budgets</h1>
          <p className="text-gray-400 text-sm mt-1">Monthly spending limits by category. Click a budget to edit it.</p>
        </div>
        {availableCategories.length > 0 && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors duration-200"
          >
            <Plus size={15} />
            Add budget
          </button>
        )}
      </div>

      {formVisible && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800">
              {editingBudget ? `Edit ${editingBudget.category} budget` : 'New budget'}
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!editingBudget && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
                    required
                  >
                    <option value="">Select a category</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={editingBudget ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly limit (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors duration-200',
                  submitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {submitting ? 'Saving...' : 'Save budget'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16">
          <p className="text-gray-400 text-sm">No budgets set yet</p>
          <button
            onClick={handleAddNew}
            className="mt-3 text-sm text-indigo-primary hover:text-indigo-hover active:opacity-70 transition-opacity"
          >
            Set your first budget
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.filter((b) => b.id !== editingBudget?.id).map((budget) => {

            const percentage = Math.min((budget.spent / budget.budget_amount) * 100, 100)
            const remaining = budget.budget_amount - budget.spent
            const isOver = budget.spent > budget.budget_amount

            return (
              <div
                key={budget.id}
                onClick={() => handleCardClick(budget)}
                className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-primary p-5 group cursor-pointer transition-colors duration-150"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: budget.colour }}
                    />
                    <span className="text-sm font-medium text-gray-800">{budget.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      'text-xs font-medium',
                      isOver ? 'text-danger' : 'text-gray-500'
                    )}>
                      {isOver
                        ? `${formatCurrency(Math.abs(remaining))} over`
                        : `${formatCurrency(remaining)} left`}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, budget.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-danger transition-all duration-150"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <AnimatedBar percentage={percentage} isOver={isOver} />

                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">
                    {formatCurrency(budget.spent)} spent
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatCurrency(budget.budget_amount)} limit
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}