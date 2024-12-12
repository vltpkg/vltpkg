export type State = {
  theme: 'auto' | 'dark' | 'light'
}

export type Action = {
  updateTheme: (theme: State['theme']) => void
}
