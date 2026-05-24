import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { z } from 'zod'
import { createGuestAccount } from '@/lib/guest'

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        guest: { label: 'Guest', type: 'text' },
        guestId: { label: 'Guest ID', type: 'text' },
      },
      async authorize(credentials) {
        // Guest login — create a fresh isolated guest account
        if (credentials?.guest === 'true') {
            // Check if returning to existing guest account
            if (credentials?.guestId) {
                const [rows] = await pool.execute(
                'SELECT * FROM users WHERE id = ? AND is_guest = TRUE',
                [credentials.guestId]
                ) as any[]

                const existingGuest = (rows as any[])[0]
                if (existingGuest) {
                return {
                    id: String(existingGuest.id),
                    email: existingGuest.email,
                    name: existingGuest.name,
                    isGuest: true,
                }
                }
            }

            // No existing guest found, create new one
            const guest = await createGuestAccount()
            return guest
        }

        // Normal login
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const [rows] = await pool.execute(
          'SELECT * FROM users WHERE email = ? AND is_guest = FALSE',
          [email]
        ) as any[]

        const user = (rows as any[])[0]
        if (!user) return null

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) return null

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          isGuest: false,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isGuest = (user as any).isGuest ?? false
        const maxAge = token.isGuest
          ? 48 * 60 * 60
          : 30 * 24 * 60 * 60
        token.exp = Math.floor(Date.now() / 1000) + maxAge
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.isGuest = token.isGuest as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
})