import { motion, AnimatePresence } from 'framer-motion'
import { useQueryBar } from '@/components/query-bar/context.jsx'

export const QueryError = () => {
  const { queryError } = useQueryBar()

  return (
    <AnimatePresence>
      {queryError && (
        <motion.div
          className="absolute left-0 flex"
          initial={{ opacity: 0, top: '2.75rem' }}
          animate={{ opacity: 1, top: '3rem' }}
          exit={{ opacity: 0, top: '2.75rem' }}>
          <p className="text-sm text-red-500">{queryError}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
