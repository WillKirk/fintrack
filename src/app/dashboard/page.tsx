'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type DashboardData = {
  income: number
  expenses: number
  balance: number
  spendingByCategory: { name: string; colour: string; total: number }[]
  recentTransactions: {
    id: number
    type: 'income' | 'expense'
    amount: number
    description: string
    date: string
    category: string
    colour: string
  }[]
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
  })
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
    .then((res) => res.json())
    .then((data) => {
      setData({
        ...data,
        spendingByCategory: data.spendingByCategory.map((cat: any) => ({
          ...cat,
          total: Number(cat.total),
        })),
      })
      setLoading(false)
    })
  }, [])

  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }
  console.log('spendingByCategory:', data?.spendingByCategory)

  return (
    <div className="max-w-7xl mx-auto">

      <div className="mb-8">
        <p className="text-gray-400 text-sm font-mono">{month}</p>
        <h1 className="text-2xl font-semibold text-gray-800 tracking-tight mt-1">
          Welcome back, {session?.user?.name?.split(' ')[0]}
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Balance</p>
            <div className="w-8 h-8 bg-indigo-subtle rounded-lg flex items-center justify-center">
              <Wallet size={14} className="text-indigo-primary" />
            </div>
          </div>
          <p className={cn(
            'text-2xl font-semibold tracking-tight',
            data!.balance >= 0 ? 'text-gray-800' : 'text-danger'
          )}>
            {formatCurrency(data!.balance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Income</p>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight size={14} className="text-success" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-gray-800">
            {formatCurrency(data!.income)}
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Expenses</p>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <ArrowDownRight size={14} className="text-danger" />
            </div>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-gray-800">
            {formatCurrency(data!.expenses)}
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">

        {/* Spending by category */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-800 mb-4">Spending by category</h2>
          {data!.spendingByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-gray-400 text-sm">No expenses this month</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie
                    data={data!.spendingByCategory}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {data!.spendingByCategory.map((entry, index) => (
                      <Cell key={index} fill={entry.colour} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data!.spendingByCategory.slice(0, 5).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.colour }}
                      />
                      <span className="text-xs text-gray-600">{cat.name}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-800">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-800">Recent transactions</h2>
            <Link
              href="/transactions"
              className="text-xs text-indigo-primary hover:text-indigo-hover"
            >
              View all
            </Link>
          </div>
          {data!.recentTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-gray-400 text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data!.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: tx.colour + '20' }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tx.colour }}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-800 font-medium">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tx.category} · {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    'text-sm font-medium',
                    tx.type === 'income' ? 'text-success' : 'text-danger'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}