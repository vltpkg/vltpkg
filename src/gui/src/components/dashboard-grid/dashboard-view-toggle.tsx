import { Toggle } from '@/components/ui/toggle.tsx'
import type { Option } from '@/components/ui/toggle.tsx'
import { LayoutGrid, Sheet } from 'lucide-react'

export type View = 'table' | 'grid'

interface DashboardViewToggleProps {
  currentView: View
  setCurrentView: React.Dispatch<React.SetStateAction<View>>
}

interface DashboardToggle extends Option {
  key: View
}

export const DashboardViewToggle = ({
  setCurrentView,
}: DashboardViewToggleProps) => {
  const options: [DashboardToggle, DashboardToggle] = [
    {
      icon: props => <LayoutGrid {...props} />,
      toolTipContent: 'Grid',
      key: 'grid',
      callBack: () => setCurrentView('grid'),
    },
    {
      icon: props => <Sheet {...props} />,
      toolTipContent: 'Table',
      key: 'table',
      callBack: () => setCurrentView('table'),
    },
  ]

  return <Toggle options={options} />
}
