'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleGuest() {
    setLoading(true)
    const result = await signIn('credentials', {
      email: 'guest@fintrack.app',
      password: 'guestpassword',
      redirect: false,
    })

    if (result?.error) {
      setError('Guest login failed, please try again')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">
            Fin<span className="text-indigo-primary">Track</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/20 focus:border-indigo-primary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-danger text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full bg-indigo-primary hover:bg-indigo-hover text-white text-sm font-medium py-2.5 rounded-lg transition-colors duration-200',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">
              or
            </div>
          </div>

          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-lg border border-gray-200 transition-colors duration-200"
          >
            Continue as guest
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-primary hover:text-indigo-hover font-medium">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}