'use client'

import { Tabs } from '@/components/ui/tabs'
import { usePackageManagerTabs } from '@/hooks/use-preferred-package-manager'

// prose <Tabs> from MDX; package-manager tabs share the stored preference with code cards
export const SyncedTabs = ({
  labels,
  ...props
}: Omit<
  React.ComponentProps<typeof Tabs>,
  'value' | 'defaultValue' | 'onValueChange'
> & { labels: string[] }) => (
  <Tabs {...props} {...usePackageManagerTabs(labels)} />
)
