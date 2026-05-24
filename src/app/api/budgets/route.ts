import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { z } from 'zod'

const budgetSchema = z.object({
  category_id: z.number().int().positive(),
  amount: z.number().positive(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const [rows] = await pool.execute(
    `SELECT 
      b.id,
      b.amount as budget_amount,
      c.id as category_id,
      c.name as category,
      c.colour,
      COALESCE(SUM(t.amount), 0) as spent
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     LEFT JOIN transactions t 
       ON t.category_id = c.id 
       AND t.type = 'expense'
       AND t.date BETWEEN ? AND ?
     WHERE b.user_id = ?
     GROUP BY b.id, b.amount, c.id, c.name, c.colour
     ORDER BY c.name`,
    [firstOfMonth, lastOfMonth, session.user.id]
  ) as any[]

  const budgets = rows.map((row: any) => ({
    ...row,
    budget_amount: Number(row.budget_amount),
    spent: Number(row.spent),
  }))

  return NextResponse.json(budgets)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = budgetSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { category_id, amount } = parsed.data

  // Upsert — update if exists, insert if not
  await pool.execute(
    `INSERT INTO budgets (user_id, category_id, amount)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE amount = ?`,
    [session.user.id, category_id, amount, amount]
  )

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  await pool.execute(
    'DELETE FROM budgets WHERE id = ? AND user_id = ?',
    [id, session.user.id]
  )

  return NextResponse.json({ success: true })
}