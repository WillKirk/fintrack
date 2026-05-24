import pool from '@/lib/db'

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

export async function deleteOldGuestAccounts() {
  await pool.execute(
    `DELETE FROM users 
     WHERE is_guest = TRUE 
     AND created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)`
  )
}

export async function createGuestAccount() {
  await deleteOldGuestAccounts()

  const guestEmail = `guest_${Date.now()}@fintrack.app`
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, is_guest) VALUES (?, ?, TRUE)',
    ['Guest', guestEmail]
  ) as any[]

  const userId = result.insertId

  // Batch insert categories
  const categoryValues = defaultCategories
    .map((cat) => `(${userId}, '${cat.name}', '${cat.type}', '${cat.colour}')`)
    .join(',')

  const [catResult] = await pool.execute(
    `INSERT INTO categories (user_id, name, type, colour) VALUES ${categoryValues}`
  ) as any[]

  // Build category ID map by name
  const categoryIds: Record<string, number> = {}
  defaultCategories.forEach((cat, i) => {
    categoryIds[cat.name] = catResult.insertId + i
  })

  const now = new Date()

  function monthDate(monthsAgo: number, day: number) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day)
    return d.toISOString().split('T')[0]
  }

  const transactions = [
    // 3 months ago
    { cat: 'Salary', type: 'income', amount: 3200.00, desc: 'Monthly salary', date: monthDate(3, 1) },
    { cat: 'Rent', type: 'expense', amount: 1200.00, desc: 'Rent', date: monthDate(3, 2) },
    { cat: 'Utilities', type: 'expense', amount: 85.00, desc: 'Electric bill', date: monthDate(3, 3) },
    { cat: 'Utilities', type: 'expense', amount: 45.00, desc: 'Internet', date: monthDate(3, 3) },
    { cat: 'Food', type: 'expense', amount: 62.50, desc: 'Tesco', date: monthDate(3, 5) },
    { cat: 'Transport', type: 'expense', amount: 89.00, desc: 'Monthly travel card', date: monthDate(3, 5) },
    { cat: 'Food', type: 'expense', amount: 48.20, desc: 'Sainsburys', date: monthDate(3, 9) },
    { cat: 'Entertainment', type: 'expense', amount: 14.99, desc: 'Netflix', date: monthDate(3, 10) },
    { cat: 'Entertainment', type: 'expense', amount: 9.99, desc: 'Spotify', date: monthDate(3, 10) },
    { cat: 'Freelance', type: 'income', amount: 450.00, desc: 'Freelance project', date: monthDate(3, 12) },
    { cat: 'Food', type: 'expense', amount: 32.00, desc: 'Dinner out', date: monthDate(3, 14) },
    { cat: 'Shopping', type: 'expense', amount: 76.00, desc: 'ASOS order', date: monthDate(3, 15) },
    { cat: 'Health', type: 'expense', amount: 45.00, desc: 'Gym membership', date: monthDate(3, 16) },
    { cat: 'Food', type: 'expense', amount: 55.80, desc: 'Tesco', date: monthDate(3, 19) },
    { cat: 'Transport', type: 'expense', amount: 24.50, desc: 'Uber', date: monthDate(3, 21) },
    { cat: 'Entertainment', type: 'expense', amount: 65.00, desc: 'Dinner with friends', date: monthDate(3, 22) },
    { cat: 'Investments', type: 'income', amount: 120.00, desc: 'Dividend payment', date: monthDate(3, 25) },
    { cat: 'Other', type: 'expense', amount: 29.99, desc: 'Amazon purchase', date: monthDate(3, 27) },

    // 2 months ago
    { cat: 'Salary', type: 'income', amount: 3200.00, desc: 'Monthly salary', date: monthDate(2, 1) },
    { cat: 'Rent', type: 'expense', amount: 1200.00, desc: 'Rent', date: monthDate(2, 2) },
    { cat: 'Utilities', type: 'expense', amount: 78.00, desc: 'Electric bill', date: monthDate(2, 3) },
    { cat: 'Utilities', type: 'expense', amount: 45.00, desc: 'Internet', date: monthDate(2, 3) },
    { cat: 'Food', type: 'expense', amount: 71.30, desc: 'Tesco', date: monthDate(2, 5) },
    { cat: 'Transport', type: 'expense', amount: 89.00, desc: 'Monthly travel card', date: monthDate(2, 5) },
    { cat: 'Entertainment', type: 'expense', amount: 14.99, desc: 'Netflix', date: monthDate(2, 10) },
    { cat: 'Entertainment', type: 'expense', amount: 9.99, desc: 'Spotify', date: monthDate(2, 10) },
    { cat: 'Food', type: 'expense', amount: 44.60, desc: 'Sainsburys', date: monthDate(2, 11) },
    { cat: 'Health', type: 'expense', amount: 45.00, desc: 'Gym membership', date: monthDate(2, 16) },
    { cat: 'Shopping', type: 'expense', amount: 120.00, desc: 'Zara', date: monthDate(2, 17) },
    { cat: 'Food', type: 'expense', amount: 38.90, desc: 'Tesco', date: monthDate(2, 18) },
    { cat: 'Transport', type: 'expense', amount: 18.40, desc: 'Uber', date: monthDate(2, 20) },
    { cat: 'Freelance', type: 'income', amount: 600.00, desc: 'Freelance project', date: monthDate(2, 20) },
    { cat: 'Entertainment', type: 'expense', amount: 45.00, desc: 'Concert tickets', date: monthDate(2, 22) },
    { cat: 'Health', type: 'expense', amount: 25.00, desc: 'Pharmacy', date: monthDate(2, 23) },
    { cat: 'Investments', type: 'income', amount: 120.00, desc: 'Dividend payment', date: monthDate(2, 25) },
    { cat: 'Other', type: 'expense', amount: 15.99, desc: 'Amazon purchase', date: monthDate(2, 27) },

    // This month
    { cat: 'Salary', type: 'income', amount: 3200.00, desc: 'Monthly salary', date: monthDate(0, 1) },
    { cat: 'Rent', type: 'expense', amount: 1200.00, desc: 'Rent', date: monthDate(0, 2) },
    { cat: 'Utilities', type: 'expense', amount: 82.00, desc: 'Electric bill', date: monthDate(0, 3) },
    { cat: 'Utilities', type: 'expense', amount: 45.00, desc: 'Internet', date: monthDate(0, 3) },
    { cat: 'Food', type: 'expense', amount: 67.40, desc: 'Tesco', date: monthDate(0, 5) },
    { cat: 'Transport', type: 'expense', amount: 89.00, desc: 'Monthly travel card', date: monthDate(0, 5) },
    { cat: 'Entertainment', type: 'expense', amount: 14.99, desc: 'Netflix', date: monthDate(0, 10) },
    { cat: 'Entertainment', type: 'expense', amount: 9.99, desc: 'Spotify', date: monthDate(0, 10) },
    { cat: 'Food', type: 'expense', amount: 53.20, desc: 'Sainsburys', date: monthDate(0, 11) },
    { cat: 'Health', type: 'expense', amount: 45.00, desc: 'Gym membership', date: monthDate(0, 16) },
    { cat: 'Transport', type: 'expense', amount: 32.00, desc: 'Uber', date: monthDate(0, 17) },
    { cat: 'Freelance', type: 'income', amount: 350.00, desc: 'Freelance project', date: monthDate(0, 18) },
    { cat: 'Food', type: 'expense', amount: 41.80, desc: 'Tesco', date: monthDate(0, 19) },
    { cat: 'Shopping', type: 'expense', amount: 89.00, desc: 'Nike trainers', date: monthDate(0, 20) },
    { cat: 'Investments', type: 'income', amount: 120.00, desc: 'Dividend payment', date: monthDate(0, 20) },
    { cat: 'Entertainment', type: 'expense', amount: 55.00, desc: 'Dinner out', date: monthDate(0, 21) },
  ]

  // Batch insert transactions
  const txValues = transactions
    .filter((tx) => categoryIds[tx.cat])
    .map((tx) => `(${userId}, ${categoryIds[tx.cat]}, '${tx.type}', ${tx.amount}, '${tx.desc}', '${tx.date}')`)
    .join(',')

  if (txValues) {
    await pool.execute(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, date) VALUES ${txValues}`
    )
  }

  return {
    id: String(userId),
    email: guestEmail,
    name: 'Guest',
    isGuest: true,
  }
}