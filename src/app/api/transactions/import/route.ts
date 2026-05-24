import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { z } from 'zod'

const importSchema = z.object({
  transactions: z.array(z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(),
    category_id: z.number().int().positive(),
    description: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }))
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = importSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { transactions } = parsed.data
  let imported = 0

  for (const tx of transactions) {
    await pool.execute(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.user.id, tx.category_id, tx.type, tx.amount, tx.description ?? null, tx.date]
    )
    imported++
  }

  return NextResponse.json({ imported }, { status: 201 })
}