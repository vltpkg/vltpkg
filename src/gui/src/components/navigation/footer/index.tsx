import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { Vlt } from '@/components/icons/index.ts'
import ScrambleHover from '@/components/ui/scramble-hover.tsx'
import { ThemeSwitcher } from '@/components/ui/theme-switcher.tsx'
import { footerLinkGroups } from './data.ts'

import type React from 'react'
import type { ComponentProps, ReactNode } from 'react'

const isExternalLink = (href: string) => {
  return href.startsWith('http://') || href.startsWith('https://')
}

export const Footer = () => {
  return (
    <footer
      className="relative h-[300px] w-full border-t"
      style={{
        clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)',
      }}>
      <div className="fixed bottom-0 h-[300px] w-full max-w-svw">
        <div className="sticky top-[calc(100vh-300px)] h-full overflow-y-auto">
          <div className="relative flex size-full max-w-svw flex-col justify-between gap-5 px-4">
            <div
              aria-hidden
              className="absolute inset-0 isolate z-0 opacity-50 contain-strict max-md:hidden dark:opacity-100">
              <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full" />
              <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full" />
              <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 rounded-full" />
            </div>
            <div className="flex flex-col gap-8 pt-12 md:flex-row">
              <AnimatedContainer className="w-full max-w-sm min-w-2xs space-y-4">
                <Link
                  to="/"
                  className="focus-visible:ring-ring flex items-center justify-start gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  aria-label="vlt home">
                  <Vlt />
                </Link>
              </AnimatedContainer>
              {footerLinkGroups.map((group, index) => (
                <AnimatedContainer
                  className="w-full"
                  delay={0.1 + index * 0.1}
                  key={group.label}>
                  <nav
                    className="mb-10 md:mb-0"
                    aria-label={`${group.label} navigation`}>
                    <h3 className="text-foreground text-sm font-medium">
                      {group.label}
                    </h3>
                    <ul className="text-muted-foreground mt-4 space-y-2 text-sm md:text-xs lg:text-sm">
                      {group.links.map(link => {
                        const isExternal = isExternalLink(link.href)
                        const linkContent = (
                          <>
                            {link.icon && (
                              <link.icon
                                className="me-1 size-4"
                                aria-hidden="true"
                              />
                            )}
                            <ScrambleHover
                              text={link.title}
                              scrambleSpeed={50}
                              maxIterations={8}
                              useOriginalCharsOnly={true}
                              className="cursor-pointer"
                            />
                            {isExternal && (
                              <ExternalLink
                                className="ms-1 size-3 opacity-50"
                                aria-hidden="true"
                              />
                            )}
                            {isExternal && (
                              <span className="sr-only">
                                (opens in new window)
                              </span>
                            )}
                          </>
                        )

                        return (
                          <li
                            key={link.title}
                            className="text-sm font-medium">
                            {isExternal ?
                              <a
                                className="hover:text-foreground focus-visible:ring-ring inline-flex items-center rounded-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer">
                                {linkContent}
                              </a>
                            : <Link
                                className="hover:text-foreground focus-visible:ring-ring inline-flex items-center rounded-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                to={link.href}>
                                {linkContent}
                              </Link>
                            }
                          </li>
                        )
                      })}
                    </ul>
                  </nav>
                </AnimatedContainer>
              ))}
            </div>
            <div
              className="text-muted-foreground z-[10] flex flex-col items-center justify-between gap-2 border-t py-4 text-sm md:flex-row"
              role="contentinfo">
              <p>
                <small>
                  &copy; {new Date().getFullYear()} vlt technology
                  inc, All rights reserved.
                </small>
              </p>
              <div className="flex items-center gap-4">
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

interface AnimatedContainerProps extends ComponentProps<
  typeof motion.div
> {
  children?: ReactNode
  delay?: number
}

const AnimatedContainer = ({
  delay = 0.1,
  children,
  ...props
}: AnimatedContainerProps) => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return children
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      transition={{ delay, duration: 0.8 }}
      viewport={{ once: true }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      {...props}>
      {children}
    </motion.div>
  )
}
