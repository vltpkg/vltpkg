import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge.jsx'
import { useTheme } from '@/components/ui/theme-provider.jsx'

interface LabelBadgeProps {
  name: string
  color: string
  className?: string
}

/**
 * Ensures the text color is always legible against a user-selected background color.
 *
 * This function converts a hex color code into RGB, calculates its relative luminance,
 * and determines whether the text should be black or white based on a luminance threshold.
 *
 */
const getContrastTextColor = (hex: string, theme: string): string => {
  if (
    !hex.startsWith('#') ||
    (hex.length !== 7 && hex.length !== 4)
  ) {
    throw new Error(
      'Invalid hex color. Must be in #RRGGBB or #RGB format.',
    )
  }

  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

  if (theme === 'dark') {
    return luminance > 0.55 ? 'black' : 'white'
  }
  return luminance > 0.618 ? 'black' : 'white'
}

const LabelBadge = ({
  name,
  color,
  className = '',
}: LabelBadgeProps) => {
  const { resolvedTheme: theme } = useTheme()
  const [textColor, setTextColor] = useState<string>('')

  useEffect(() => {
    if (color) {
      setTextColor(getContrastTextColor(color, theme))
    }
  }, [color, theme])

  return (
    <Badge
      style={{
        backgroundColor: color,
        color: textColor,
      }}
      className={`font-medium ${className}`}>
      {name}
    </Badge>
  )
}

export { LabelBadge }
