import { ThemeProvider } from 'next-themes'

export const NextThemesProvider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return <ThemeProvider>{children}</ThemeProvider>
}
