import { defineEventHandler, getRouterParam, proxy } from 'h3'
import { useDatabase } from 'nitro/runtime'

export default defineEventHandler(async event => {
  const db = useDatabase()
  // Create users table
  await db.sql`DROP TABLE IF EXISTS users`
  await db.sql`CREATE TABLE IF NOT EXISTS users ("id" TEXT PRIMARY KEY, "firstName" TEXT, "lastName" TEXT, "email" TEXT)`

  // Add a new user
  const userId = String(Math.round(Math.random() * 10_000))
  await db.sql`INSERT INTO users VALUES (${userId}, 'John', 'Doe', '')`

  // Query for users
  const { rows } =
    await db.sql`SELECT * FROM users WHERE id = ${userId}`
  const pkg = getRouterParam(event, 'package')

  return { pkg, rows }
  // return proxy(event, `https://registry.npmjs.org/${pkg}`)
})
