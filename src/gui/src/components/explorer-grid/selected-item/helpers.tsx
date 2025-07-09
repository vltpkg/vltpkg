import { TabsContent } from '@/components/ui/tabs.tsx'
import { motion } from 'framer-motion'

import type { MotionProps } from 'framer-motion'

export const tabMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(2px)',
  },
  animate: { opacity: 1, filter: 'blur(0px)', x: 0 },
  exit: {
    opacity: 0,
    filter: 'blur(0px)',
  },
  transition: { duration: 0.25, ease: 'easeInOut' },
}

export const MotionTabsContent = motion.create(TabsContent)
