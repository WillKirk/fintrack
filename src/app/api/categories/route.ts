import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [rows] = await pool.execute(
    'SELECT id, name, type, colour FROM categories WHERE user_id = ? ORDER BY type, name',
    [session.user.id]
  ) as any[]

  return NextResponse.json(rows)
}