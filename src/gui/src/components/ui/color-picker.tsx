import React, { useEffect, useState } from 'react'
import { type Color } from '@/state/types.js'
import { Input } from '@/components/ui/input.jsx'

interface ColorPickerProps {
  defaultColor?: Color
  defaultInput?: Color
  onChange: (color: Color) => void
}

const DEFAULT_COLORS: Color[] = [
  '#ef4444',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
]

export const DEFAULT_COLOR: Color = '#00FF5F'

export function ColorPicker({
  onChange,
  defaultColor,
  defaultInput,
}: ColorPickerProps) {
  const [inputColor, setInputColor] = useState<Color>(
    defaultInput ?? DEFAULT_COLOR,
  )
  const [currentColor, setCurrentColor] = useState<Color>(
    defaultColor ?? DEFAULT_COLOR,
  )

  useEffect(() => {
    setCurrentColor(defaultColor ? defaultColor : DEFAULT_COLOR)
    setCurrentColor(defaultInput ? defaultInput : DEFAULT_COLOR)
  }, [defaultColor, defaultInput])

  const isValidHex = (color: string): color is Color =>
    /^#[0-9A-F]{6}$/i.test(color)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newColor = e.target.value
    if (isValidHex(newColor)) {
      setInputColor(newColor)
      setCurrentColor(newColor)
      onChange(newColor)
    }
  }

  const handleDefaultColorClick = (color: Color) => {
    setInputColor(color)
    setCurrentColor(color)
    onChange(color)
  }

  return (
    <div className="mx-auto w-full max-w-md px-2 py-1">
      <div className="relative w-full">
        <Input
          className="w-full"
          type="text"
          value={inputColor}
          onChange={handleInputChange}
          placeholder="#00FF5F"
        />
        <div
          className="absolute bottom-0 right-2 top-0 my-auto flex h-5 w-5 items-center justify-center rounded-sm"
          style={{
            backgroundColor:
              isValidHex(inputColor) ? inputColor : currentColor,
          }}>
          <input
            onChange={e => {
              if (isValidHex(e.target.value)) {
                setInputColor(e.target.value)
                onChange(e.target.value)
              }
            }}
            className="relative h-[20px] w-[20px] cursor-pointer opacity-0"
            type="color"
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-8 gap-2">
        {DEFAULT_COLORS.map(color => (
          <button
            key={color}
            onClick={() => handleDefaultColorClick(color)}
            className="aspect-square w-full rounded-sm border border-[1px] border-muted-foreground/25 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  )
}
