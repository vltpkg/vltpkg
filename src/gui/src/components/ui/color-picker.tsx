import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input.jsx'

interface ColorPickerProps {
  defaultColor?: string
  defaultInput?: string
  onChange: (color: string) => void
}

const DEFAULT_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
]

export function ColorPicker({
  onChange,
  defaultColor,
  defaultInput,
}: ColorPickerProps) {
  const [inputColor, setInputColor] = useState(defaultInput ?? '')
  const [currentColor, setCurrentColor] = useState(defaultColor ?? '')

  useEffect(() => {
    setCurrentColor(defaultColor ? defaultColor : '#00FF5F')
    setCurrentColor(defaultInput ? defaultInput : '#00FF5F')
  }, [defaultColor, defaultInput])

  const isValidHex = (color: string) => /^#[0-9A-F]{6}$/i.test(color)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newColor = e.target.value
    setInputColor(newColor)
    if (isValidHex(newColor)) {
      setCurrentColor(newColor)
      onChange(newColor)
    }
  }

  const handleDefaultColorClick = (color: string) => {
    setInputColor(color)
    setCurrentColor(color)
    onChange(color)
  }

  return (
    <div className="w-full max-w-md mx-auto px-2 py-1">
      <div className="relative w-full">
        <Input
          className="w-full"
          type="text"
          value={inputColor}
          onChange={handleInputChange}
          placeholder="#00FF5F"
        />
        <div
          className="absolute flex items-center justify-center top-0 bottom-0 my-auto right-2 h-5 w-5 rounded-sm"
          style={{
            backgroundColor:
              isValidHex(inputColor) ? inputColor : currentColor,
          }}>
          <input
            onChange={e => {
              setInputColor(e.target.value)
              onChange(e.target.value)
            }}
            className="relative cursor-pointer h-[20px] w-[20px] opacity-0"
            type="color"
          />
        </div>
      </div>
      <div className="grid mt-4 grid-cols-8 gap-2">
        {DEFAULT_COLORS.map(color => (
          <button
            key={color}
            onClick={() => handleDefaultColorClick(color)}
            className="w-full aspect-square rounded-sm border border-[1px] border-muted-foreground/25 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  )
}
