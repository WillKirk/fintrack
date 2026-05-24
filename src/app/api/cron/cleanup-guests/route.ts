import { NextResponse } from 'next/server'
import { deleteOldGuestAccounts } from '@/lib/guest'

export async function GET(request: Request) {
  // Verify the request is coming from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    await deleteOldGuestAccounts()
    return NextResponse.json({ success: true, message: 'Guest accounts cleaned up' })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}