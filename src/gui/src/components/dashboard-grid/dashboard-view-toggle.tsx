import { useMemo } from 'react'
import { Toggle } from '@/components/ui/toggle.tsx'
import { LayoutGrid, Sheet } from 'lucide-react'

import type {
  Option,
  ToggleClassNames,
} from '@/components/ui/toggle.tsx'
import type {
  DashboardState,
  DashboardAction,
} from '@/state/dashboard.ts'

interface DashboardViewToggleProps {
  currentView: DashboardState['currentView']
  setCurrentView: DashboardAction['updateCurrentView']
  classNames?: ToggleClassNames
}

interface DashboardToggle extends Option {
  key: DashboardState['currentView']
}

export const DashboardViewToggle = ({
  currentView,
  setCurrentView,
  classNames,
}: DashboardViewToggleProps) => {
  const options: [DashboardToggle, DashboardToggle] = useMemo(
    () => [
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
    ],
    [setCurrentView],
  )

  return (
    <Toggle
      classNames={classNames}
      options={options}
      value={currentView}
    />
  )
}
