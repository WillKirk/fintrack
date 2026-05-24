import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { z } from 'zod'

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category_id: z.number().int().positive(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [rows] = await pool.execute(
    `SELECT t.id, t.type, t.amount, t.description, t.date,
            c.id as category_id, c.name as category, c.colour
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ?
     ORDER BY t.date DESC, t.created_at DESC`,
    [session.user.id]
  ) as any[]

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = transactionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { type, amount, category_id, description, date } = parsed.data

  const [result] = await pool.execute(
    `INSERT INTO transactions (user_id, category_id, type, amount, description, date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [session.user.id, category_id, type, amount, description ?? null, date]
  ) as any[]

  return NextResponse.json({ id: result.insertId }, { status: 201 })
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
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [id, session.user.id]
  )

  return NextResponse.json({ success: true })
}