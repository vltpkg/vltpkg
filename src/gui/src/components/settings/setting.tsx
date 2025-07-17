import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils.ts'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu.tsx'
import { ChevronRight } from 'lucide-react'

import type { PropsWithChildren } from 'react'

/**
 * COMPONENT USAGE:
 *
 *  <SettingWrapper>
 *    <SettingSection {...props}>
 *      <SettingField {...props}/>
 *      <SettingField {...props}/>
 *      <SettingSplit/>
 *      <SettingField {...props}/>
 *    <SettingSection/>
 *  </SettingWrapper/>
 */

interface SettingWrapperProps extends PropsWithChildren {
  className?: string
}

export const SettingWrapper = ({
  className,
  children,
}: SettingWrapperProps) => {
  return (
    <div
      className={cn(
        'grid grid-cols-12 px-4 py-8 md:py-16 lg:px-0',
        className,
      )}>
      <div className="col-span-12 col-start-1 flex flex-col gap-6 md:col-span-10 md:col-start-2 lg:col-span-6 lg:col-start-4">
        {children}
      </div>
    </div>
  )
}

export const SettingSplit = () => {
  return <div data-setting="split" className="hidden" />
}

interface SettingSectionProps extends PropsWithChildren {
  className?: string
  title: string
}

export const SettingSection = ({
  title,
  children,
  className,
}: SettingSectionProps) => {
  return (
    <section
      className={cn('flex cursor-default flex-col gap-4', className)}>
      <h3 className="text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      <fieldset className={cn('group')}>{children}</fieldset>
    </section>
  )
}

type SettingType = 'dropdown' | 'toggle'

interface BaseField {
  type: SettingType
}

export interface DropdownOption {
  label: string
  onSelect: () => void
  defaultValue?: boolean
}

export interface DropdownFieldProps extends BaseField {
  type: 'dropdown'
  placeholder: string
  options: DropdownOption[]
}

export interface ToggleFieldProps extends BaseField {
  type: 'toggle'
  onActive: () => void
  onInactive: () => void
  defaultValue?: boolean
}

export interface SettingFieldProps {
  name: string
  description: string
  field: DropdownFieldProps | ToggleFieldProps
  className?: string
}

export const SettingField = ({
  name,
  description,
  field,
  className,
}: SettingFieldProps) => {
  const styles = `
    first:rounded-t-xl
    last:rounded-b-xl

    [&:not(:first-child):not(last-child)]:border-t-[0px]

    [fieldset:has([data-setting=split])>div[data-setting=split]+&]:mt-4
    [fieldset:has([data-setting=split])>div[data-setting=split]+&]:rounded-t-xl
    [fieldset:has([data-setting=split])>div[data-setting=split]+&]:border-t-[1px]

    [&:has(+[data-setting=split])]:rounded-b-xl
  `

  const renderField = () => {
    switch (field.type) {
      case 'dropdown':
        return <DropdownField {...field} />
      case 'toggle':
        return <ToggleField {...field} />
    }
  }

  return (
    <div
      data-setting="field"
      className={cn(
        'flex justify-between border-[1px] bg-card p-4',
        styles,
        className,
      )}>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs font-medium text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex">{renderField()}</div>
    </div>
  )
}

const DropdownField = ({
  placeholder,
  options,
}: DropdownFieldProps) => {
  const defaultValue =
    options.find(option => option.defaultValue) ?? null
  const [selected, setSelected] = useState<DropdownOption | null>(
    defaultValue,
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="duration-250 group inline-flex w-full min-w-36 cursor-default items-center justify-between gap-4 overflow-hidden truncate rounded-md border-[1px] border-border px-2 py-1 text-sm transition-colors hover:border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:border-neutral-800 dark:hover:bg-neutral-900">
          {selected ? selected.label : placeholder}
          <ChevronRight className="size-4 opacity-50 transition-transform duration-300 group-data-[state=open]:rotate-90" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onCloseAutoFocus={e => e.preventDefault()}>
        {options.map((option, idx) => (
          <DropdownMenuItem
            onSelect={() => {
              if (selected !== option) {
                option.onSelect()
                setSelected(option)
              } else {
                setSelected(null)
              }
            }}
            key={`${option.label}-${idx}`}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ToggleField = ({
  defaultValue = false,
  onInactive,
  onActive,
}: ToggleFieldProps) => {
  const [active, setActive] = useState<boolean>(defaultValue)

  const toggleSetting = (o: boolean) => {
    if (o) {
      onActive()
    } else {
      onInactive()
    }
    setActive(o)
  }

  return (
    <div
      onClick={() => toggleSetting(!active)}
      className={cn(
        'duration-250 grid h-6 w-10 cursor-pointer justify-items-stretch rounded-full border-[1px] px-1 transition-colors',
        active ?
          'border-green-500/50 bg-green-500 dark:border-green-600/50 dark:bg-green-900'
        : 'border-muted-foreground/25 bg-secondary',
      )}>
      <AnimatePresence mode="popLayout" initial={false}>
        {active ?
          <motion.div
            layoutId="toggle-setting"
            className="size-4 self-center justify-self-start rounded-full bg-white dark:bg-green-400"
          />
        : <motion.div
            layoutId="toggle-setting"
            className="size-4 self-center justify-self-end rounded-full bg-muted-foreground/50"
          />
        }
      </AnimatePresence>
    </div>
  )
}
