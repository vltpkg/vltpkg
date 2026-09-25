'use client'

import React from 'react'

const useScrolled = (threshold = 300) => {
  const [scrolled, setScrolled] = React.useState<boolean>(false)

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return { scrolled }
}

export { useScrolled }
