import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const defaultCategories = [
  { name: 'Salary', type: 'income', colour: '#10B981' },
  { name: 'Freelance', type: 'income', colour: '#34D399' },
  { name: 'Investments', type: 'income', colour: '#6EE7B7' },
  { name: 'Other Income', type: 'income', colour: '#A7F3D0' },
  { name: 'Rent', type: 'expense', colour: '#EF4444' },
  { name: 'Food', type: 'expense', colour: '#F97316' },
  { name: 'Transport', type: 'expense', colour: '#EAB308' },
  { name: 'Utilities', type: 'expense', colour: '#8B5CF6' },
  { name: 'Entertainment', type: 'expense', colour: '#EC4899' },
  { name: 'Health', type: 'expense', colour: '#14B8A6' },
  { name: 'Shopping', type: 'expense', colour: '#6366F1' },
  { name: 'Other', type: 'expense', colour: '#6B7280' },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    // Check if email already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[]

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    ) as any[]

    const userId = result.insertId

    // Create default categories for the new user
    for (const category of defaultCategories) {
      await pool.execute(
        'INSERT INTO categories (user_id, name, type, colour) VALUES (?, ?, ?, ?)',
        [userId, category.name, category.type, category.colour]
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}