import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const userId = session.user.id
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  // Monthly income
  const [incomeRows] = await pool.execute(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = ? AND type = 'income'
     AND date BETWEEN ? AND ?`,
    [userId, firstOfMonth, lastOfMonth]
  ) as any[]

  // Monthly expenses
  const [expenseRows] = await pool.execute(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = ? AND type = 'expense'
     AND date BETWEEN ? AND ?`,
    [userId, firstOfMonth, lastOfMonth]
  ) as any[]

  // Spending by category this month
  const [categoryRows] = await pool.execute(
    `SELECT c.name, c.colour, COALESCE(SUM(t.amount), 0) as total
     FROM categories c
     LEFT JOIN transactions t
       ON t.category_id = c.id
       AND t.type = 'expense'
       AND t.date BETWEEN ? AND ?
     WHERE c.user_id = ? AND c.type = 'expense'
     GROUP BY c.id, c.name, c.colour
     HAVING total > 0
     ORDER BY total DESC`,
    [firstOfMonth, lastOfMonth, userId]
  ) as any[]

  // Recent transactions
  const [recentRows] = await pool.execute(
    `SELECT t.id, t.type, t.amount, t.description, t.date, c.name as category, c.colour
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ?
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT 5`,
    [userId]
  ) as any[]

  const income = Number(incomeRows[0].total)
  const expenses = Number(expenseRows[0].total)
  const balance = income - expenses

  return NextResponse.json({
    income,
    expenses,
    balance,
    spendingByCategory: categoryRows,
    recentTransactions: recentRows,
  })
}