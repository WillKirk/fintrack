'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import ConfirmModal from '@/components/ConfirmModal'

type SavingsGoal = {
  id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  created_at: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

function daysUntil(deadline: string) {
  const diff = new Date(deadline).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function monthsUntilComplete(goal: SavingsGoal) {
  const remaining = goal.target_amount - goal.current_amount
  if (remaining <= 0) return 0
  if (!goal.deadline) return null

  const days = daysUntil(goal.deadline)
  if (days <= 0) return null

  const monthlyNeeded = remaining / (days / 30)
  return monthlyNeeded
}

function AnimatedBar({ percentage }: { percentage: number }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 50)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className="w-full h-2 bg-gray-100 rounded-full mb-2">
      <div
        className="h-2 rounded-full transition-all duration-1000 bg-indigo-primary"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [topUpAmount, setTopUpAmount] = useState('')
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; goalId: number | null }>({
    isOpen: false,
    goalId: null,
  })

  useEffect(() => {
    fetch('/api/savings')
      .then((r) => r.json())
      .then((data) => {
        setGoals(data)
        setLoading(false)
      })
  }, [])

  function handleAddNew() {
    setEditingGoal(null)
    setName('')
    setTargetAmount('')
    setCurrentAmount('')
    setDeadline('')
    setTopUpAmount('')
    setError('')
    setShowForm(true)
  }

  function handleCardClick(goal: SavingsGoal) {
    setEditingGoal(goal)
    setTopUpAmount('')
    setError('')
    setShowForm(false)
  }

  function handleClose() {
    setShowForm(false)
    setEditingGoal(null)
    setName('')
    setTargetAmount('')
    setCurrentAmount('')
    setDeadline('')
    setTopUpAmount('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: currentAmount ? parseFloat(currentAmount) : 0,
        deadline: deadline || undefined,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    const updated = await fetch('/api/savings').then((r) => r.json())
    setGoals(updated)
    handleClose()
    setSubmitting(false)
  }

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGoal) return
    setError('')
    setSubmitting(true)

    const newAmount = editingGoal.current_amount + parseFloat(topUpAmount)

    const res = await fetch('/api/savings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingGoal.id,
        current_amount: newAmount,
      }),
    })

    if (!res.ok) {
      setError('Something went wrong')
      setSubmitting(false)
      return
    }

    const updated = await fetch('/api/savings').then((r) => r.json())
    setGoals(updated)
    handleClose()
    setSubmitting(false)
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setConfirmModal({ isOpen: true, goalId: id })
  }
  
  async function confirmDelete() {
    if (!confirmModal.goalId) return
    await fetch(`/api/savings?id=${confirmModal.goalId}`, { method: 'DELETE' })
    setGoals((prev) => prev.filter((g) => g.id !== confirmModal.goalId))
    if (editingGoal?.id === confirmModal.goalId) handleClose()
    setConfirmModal({ isOpen: false, goalId: null })
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
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Savings Goals</h1>
          <p className="text-gray-400 text-sm mt-1">Track progress towards your goals. Click a goal to add funds.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors duration-200"
        >
          <Plus size={15} />
          Add goal
        </button>
      </div>

      {/* New goal form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800">New goal</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
                placeholder="e.g. New car, Holiday, Emergency fund"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Already saved (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
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
                {submitting ? 'Saving...' : 'Create goal'}
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

      {/* Top up form */}
      {editingGoal && (
        <div className="bg-white rounded-2xl border border-indigo-primary p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800">Add funds to {editingGoal.name}</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleTopUp} className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount to add (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors duration-200',
                  submitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                {submitting ? 'Saving...' : 'Add funds'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
          </form>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16">
          <p className="text-gray-400 text-sm">No savings goals yet</p>
          <button
            onClick={handleAddNew}
            className="mt-3 text-sm text-indigo-primary hover:text-indigo-hover active:opacity-70 transition-opacity"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.filter((g) => g.id !== editingGoal?.id).map((goal) => {
            const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
            const remaining = goal.target_amount - goal.current_amount
            const isComplete = goal.current_amount >= goal.target_amount
            const monthlyNeeded = monthsUntilComplete(goal)
            const days = goal.deadline ? daysUntil(goal.deadline) : null

            return (
              <div
                key={goal.id}
                onClick={() => !isComplete && handleCardClick(goal)}
                className={cn(
                  'bg-white rounded-2xl border border-gray-200 p-5 group transition-colors duration-150',
                  isComplete
                    ? 'border-success/30 bg-green-50/50'
                    : 'hover:border-indigo-primary cursor-pointer'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-800">{goal.name}</h3>
                    {goal.deadline && (
                      <p className={cn(
                        'text-xs mt-0.5',
                        days !== null && days < 0 ? 'text-danger' : 'text-gray-400'
                      )}>
                        {days !== null && days < 0
                          ? 'Deadline passed'
                          : `${days} days left`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {isComplete && (
                      <span className="text-xs text-success font-medium">Complete</span>
                    )}
                    {!isComplete && monthlyNeeded && (
                      <span className="text-xs text-gray-400">
                        {formatCurrency(monthlyNeeded)}/mo needed
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, goal.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-danger transition-all duration-150"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <AnimatedBar percentage={percentage} />

                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">
                    {formatCurrency(goal.current_amount)} saved
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatCurrency(goal.target_amount)} target
                  </span>
                </div>

                {!isComplete && remaining > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatCurrency(remaining)} to go
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
      isOpen={confirmModal.isOpen}
      title="Delete goal"
      message="Are you sure you want to delete this savings goal? This can't be undone."
      onConfirm={confirmDelete}
      onCancel={() => setConfirmModal({ isOpen: false, goalId: null })}
      />
    </div>
  )
}