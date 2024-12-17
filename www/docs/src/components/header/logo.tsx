import { useStore } from '@/state'

const Logo = () => {
  const { getResolvedTheme } = useStore()
  const theme = getResolvedTheme()

  return (
    <img
      src={
        theme === 'dark' ?
          '/logos/vlt-logo-light.png'
        : '/logos/vlt-logo-dark.png'
      }
      height={43}
      width={94}
    />
  )
}

export default Logo
