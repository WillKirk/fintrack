'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount)
}

type Mode = 'compound' | 'savings'

export default function CalculatorPage() {
  const [mode, setMode] = useState<Mode>('compound')

  // Compound interest inputs
  const [principal, setPrincipal] = useState('10000')
  const [rate, setRate] = useState('7')
  const [years, setYears] = useState('10')
  const [compoundFrequency, setCompoundFrequency] = useState('12')

  // Savings goal inputs
  const [targetAmount, setTargetAmount] = useState('20000')
  const [monthlySavings, setMonthlySavings] = useState('500')
  const [savingsRate, setSavingsRate] = useState('4.5')
  const [existingSavings, setExistingSavings] = useState('0')

  const compoundData = useMemo(() => {
    const p = parseFloat(principal) || 0
    const r = parseFloat(rate) / 100 || 0
    const n = parseFloat(compoundFrequency) || 12
    const t = parseInt(years) || 0

    return Array.from({ length: t + 1 }, (_, i) => {
      const amount = p * Math.pow(1 + r / n, n * i)
      return {
        year: i,
        amount: Math.round(amount),
        interest: Math.round(amount - p),
      }
    })
  }, [principal, rate, years, compoundFrequency])

  const savingsData = useMemo(() => {
    const target = parseFloat(targetAmount) || 0
    const monthly = parseFloat(monthlySavings) || 0
    const r = parseFloat(savingsRate) / 100 / 12 || 0
    const existing = parseFloat(existingSavings) || 0

    const data = []
    let balance = existing
    let month = 0

    while (balance < target && month < 600) {
      data.push({
        month,
        balance: Math.round(balance),
        contributions: Math.round(existing + monthly * month),
        interest: Math.round(balance - existing - monthly * month),
      })
      balance = balance * (1 + r) + monthly
      month++
    }

    data.push({
      month,
      balance: Math.round(balance),
      contributions: Math.round(existing + monthly * month),
      interest: Math.round(balance - existing - monthly * month),
    })

    return data
  }, [targetAmount, monthlySavings, savingsRate, existingSavings])

  const finalCompound = compoundData[compoundData.length - 1]
  const monthsToTarget = savingsData.length - 1
  const yearsToTarget = Math.floor(monthsToTarget / 12)
  const remainingMonths = monthsToTarget % 12

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Calculator</h1>
        <p className="text-gray-400 text-sm mt-1">Project your savings and investments over time.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl border border-gray-200 p-1 gap-1 bg-white w-fit mb-8">
        <button
          onClick={() => setMode('compound')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
            mode === 'compound'
              ? 'bg-indigo-primary text-white'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Compound Interest
        </button>
        <button
          onClick={() => setMode('savings')}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
            mode === 'savings'
              ? 'bg-indigo-primary text-white'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Savings Goal
        </button>
      </div>

      {mode === 'compound' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-800">Inputs</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial investment (£)</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual interest rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time period (years)</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Compounding frequency</label>
              <select
                value={compoundFrequency}
                onChange={(e) => setCompoundFrequency(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              >
                <option value="1">Annually</option>
                <option value="4">Quarterly</option>
                <option value="12">Monthly</option>
                <option value="365">Daily</option>
              </select>
            </div>

            {/* Summary */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Initial investment</span>
                <span className="text-xs font-medium text-gray-700">{formatCurrency(parseFloat(principal) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Total interest earned</span>
                <span className="text-xs font-medium text-success">{formatCurrency(finalCompound?.interest ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Final value</span>
                <span className="text-xs font-medium text-gray-900">{formatCurrency(finalCompound?.amount ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-800 mb-6">Growth over time</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={compoundData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Y${v}`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value as number), '']}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                  name="Total value"
                />
                <Line
                  type="monotone"
                  dataKey="interest"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Interest earned"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {mode === 'savings' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-800">Inputs</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target amount (£)</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly savings (£)</label>
              <input
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Annual interest rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={savingsRate}
                onChange={(e) => setSavingsRate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Existing savings (£)</label>
              <input
                type="number"
                value={existingSavings}
                onChange={(e) => setExistingSavings(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-indigo-primary transition-colors"
              />
            </div>

            {/* Summary */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Time to reach goal</span>
                <span className="text-xs font-medium text-gray-700">
                  {yearsToTarget > 0 ? `${yearsToTarget}y ` : ''}{remainingMonths}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Total contributions</span>
                <span className="text-xs font-medium text-gray-700">
                  {formatCurrency((parseFloat(monthlySavings) || 0) * monthsToTarget + (parseFloat(existingSavings) || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Interest earned</span>
                <span className="text-xs font-medium text-success">
                  {formatCurrency(savingsData[savingsData.length - 1]?.interest ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-800 mb-6">Progress to goal</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `M${v}`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value as number), '']}
                  labelFormatter={(label) => `Month ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                  name="Balance"
                />
                <Line
                  type="monotone"
                  dataKey="contributions"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 4"
                  name="Contributions only"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}