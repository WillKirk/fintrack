import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { z } from 'zod'

const savingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).optional(),
  deadline: z.string().optional(),
})

const updateSchema = z.object({
  id: z.number().int().positive(),
  current_amount: z.number().min(0),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [rows] = await pool.execute(
    `SELECT id, name, target_amount, current_amount, deadline, created_at
     FROM savings_goals
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [session.user.id]
  ) as any[]

  const goals = rows.map((row: any) => ({
    ...row,
    target_amount: Number(row.target_amount),
    current_amount: Number(row.current_amount),
  }))

  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = savingsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { name, target_amount, current_amount, deadline } = parsed.data

  const [result] = await pool.execute(
    `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline)
     VALUES (?, ?, ?, ?, ?)`,
    [session.user.id, name, target_amount, current_amount ?? 0, deadline ?? null]
  ) as any[]

  return NextResponse.json({ id: result.insertId }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { id, current_amount } = parsed.data

  await pool.execute(
    `UPDATE savings_goals SET current_amount = ?
     WHERE id = ? AND user_id = ?`,
    [current_amount, id, session.user.id]
  )

  return NextResponse.json({ success: true })
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
    'DELETE FROM savings_goals WHERE id = ? AND user_id = ?',
    [id, session.user.id]
  )

  return NextResponse.json({ success: true })
}