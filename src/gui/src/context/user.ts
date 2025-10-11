import { createContext } from 'react-router'

import type { User } from '@/state/auth.ts'

/**
 * Router context for authenticated user
 * Used by auth middleware to pass user data to loaders/components
 */
export const userContext = createContext<User | null>(null)
